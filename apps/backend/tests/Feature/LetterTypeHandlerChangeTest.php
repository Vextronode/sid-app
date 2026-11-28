<?php

namespace Tests\Feature;

use App\Models\Letter;
use App\Models\LetterResult;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Memindahkan jenis surat ke kategori lain mengganti petugasnya. Surat yang
 * sudah disetujui tetapi tugas petugasnya belum selesai ikut pindah, jadi
 * petugas baru diberi tahu (notifikasi tugasnya dulu terkirim ke petugas lama).
 */
class LetterTypeHandlerChangeTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        $this->staf = $this->makeOfficialUser('staf_sid', $this->village)['user'];
    }

    public function test_new_handler_is_told_about_approved_letters_whose_data_change_is_not_applied(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village)['user'];
        $kaur = $this->makeOfficialUser('kaur_tu_umum', $this->village)['user'];
        $type = $this->letterType('kasi_pemerintahan', 'pelayanan', ['data_action' => 'update_citizen']);
        $open = $this->letter($type, ['status' => 'approved']);
        $this->letter($type, ['status' => 'approved', 'fulfilled_at' => now()]);
        $this->letter($type, ['status' => 'pending']);
        $this->letter($type, ['status' => 'rejected']);

        $this->moveToCategory($type, 'persuratan')->assertJsonPath('data.assigned_role', 'kaur_tu_umum');

        Notification::assertSentToTimes($kaur, LetterStatusNotification::class, 1);
        Notification::assertSentTo($kaur, LetterStatusNotification::class, function (LetterStatusNotification $notification) use ($kaur, $open, $type): bool {
            $data = $notification->toArray($kaur);

            return $data['context']['letter_id'] === $open->id
                && $data['context']['status'] === 'letter_needs_fulfillment'
                && str_contains($data['message'], "Penanganan {$type->name} dipindahkan ke Kaur TU & Umum.");
        });
        Notification::assertNotSentTo($kasi, LetterStatusNotification::class);
    }

    public function test_new_handler_is_told_about_results_to_review_and_accepted_results_to_apply(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village)['user'];
        $type = $this->letterType('kaur_tu_umum', 'persuratan', [
            'data_action' => 'update_citizen',
            'requires_result_upload' => true,
        ]);
        $toReview = $this->letter($type, ['status' => 'approved']);
        $this->uploadResult($toReview, LetterResult::STATUS_SUBMITTED);
        $toApply = $this->letter($type, ['status' => 'approved']);
        $this->uploadResult($toApply, LetterResult::STATUS_ACCEPTED);
        // Menunggu unggahan pemohon: belum tugas petugas.
        $this->letter($type, ['status' => 'approved']);
        $rejectedLast = $this->letter($type, ['status' => 'approved']);
        $this->uploadResult($rejectedLast, LetterResult::STATUS_SUBMITTED);
        $this->uploadResult($rejectedLast, LetterResult::STATUS_REJECTED);
        $done = $this->letter($type, ['status' => 'approved', 'fulfilled_at' => now()]);
        $this->uploadResult($done, LetterResult::STATUS_ACCEPTED);

        $this->moveToCategory($type, 'pelayanan')->assertJsonPath('data.assigned_role', 'kasi_pemerintahan');

        Notification::assertSentToTimes($kasi, LetterStatusNotification::class, 2);
        $sent = collect([$toReview->id => 'letter_result_submitted', $toApply->id => 'letter_needs_fulfillment']);
        foreach ($sent as $letterId => $status) {
            Notification::assertSentTo($kasi, LetterStatusNotification::class, function (LetterStatusNotification $notification) use ($kasi, $letterId, $status): bool {
                $context = $notification->toArray($kasi)['context'];

                return $context['letter_id'] === $letterId && $context['status'] === $status;
            });
        }
    }

    public function test_letters_that_only_need_printing_are_not_announced_again(): void
    {
        $kaur = $this->makeOfficialUser('kaur_tu_umum', $this->village)['user'];
        $type = $this->letterType('kasi_pemerintahan', 'pelayanan');
        $this->letter($type, ['status' => 'approved']);

        $this->moveToCategory($type, 'persuratan')->assertOk();

        Notification::assertNotSentTo($kaur, LetterStatusNotification::class);
    }

    public function test_staf_is_told_when_the_new_handler_position_is_vacant(): void
    {
        $type = $this->letterType('kasi_pemerintahan', 'pelayanan', ['data_action' => 'update_citizen']);
        $this->letter($type, ['status' => 'approved']);

        $this->moveToCategory($type, 'persuratan')->assertOk();

        Notification::assertSentTo($this->staf, LetterStatusNotification::class, function (LetterStatusNotification $notification): bool {
            return $notification->toArray($this->staf)['context']['status'] === 'handler_vacant';
        });
    }

    public function test_no_notification_when_the_handler_does_not_change(): void
    {
        $kasi = $this->makeOfficialUser('kasi_pemerintahan', $this->village)['user'];
        $type = $this->letterType('kasi_pemerintahan', 'pelayanan', ['data_action' => 'update_citizen']);
        $this->letter($type, ['status' => 'approved']);

        $this->moveToCategory($type, 'pelayanan')->assertOk();
        $this->actingAs($this->staf)
            ->putJson("/api/letter-types/{$type->id}", ['validity_days' => 10])
            ->assertOk();

        Notification::assertNotSentTo($kasi, LetterStatusNotification::class);
        Notification::assertNotSentTo($this->staf, LetterStatusNotification::class);
    }

    private function moveToCategory(LetterType $type, string $category): TestResponse
    {
        return $this->actingAs($this->staf)
            ->putJson("/api/letter-types/{$type->id}", ['category' => $category])
            ->assertOk();
    }

    private function letterType(string $assignedRole, string $category, array $attributes = []): LetterType
    {
        return LetterType::factory()->create([
            'village_id' => $this->village->id,
            'template' => 'tpl',
            'assigned_role' => $assignedRole,
            'category' => $category,
            ...$attributes,
        ]);
    }

    private function letter(LetterType $type, array $attributes): Letter
    {
        return Letter::factory()->create([
            'village_id' => $this->village->id,
            'letter_type_id' => $type->id,
            ...$attributes,
        ]);
    }

    private function uploadResult(Letter $letter, string $status): LetterResult
    {
        return LetterResult::query()->create([
            'letter_id' => $letter->id,
            'status' => $status,
            'submitted_by' => $letter->submitted_by,
        ]);
    }
}
