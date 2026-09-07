<?php

namespace Tests\Unit;

use App\Models\Citizen;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\KasiApprovalService;
use App\Services\OfficialService;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class KasiApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private KasiApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new KasiApprovalService(
            new OfficialService(new OfficialRepository, new UserRepository),
            new LetterRepository,
        );
    }

    public function test_get_dashboard_letters_returns_all_letters_with_relations(): void
    {
        Letter::factory()->count(2)->create();

        $result = $this->service->getDashboardLetters(User::factory()->create());

        $this->assertCount(2, $result);
        $this->assertTrue($result->first()->relationLoaded('citizen'));
    }

    public function test_approve_throws_403_when_letter_not_rw_approved(): void
    {
        $letter = Letter::factory()->create(['status' => 'pending']);
        $user = User::factory()->create(['role' => 'kasi_pelayanan']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Surat belum mendapat persetujuan RW.');

        $this->service->approve($letter, $user, ['status' => 'approved']);
    }

    public function test_approve_throws_403_when_role_unauthorized(): void
    {
        $letter = Letter::factory()->create(['status' => 'rw_approved']);
        $user = User::factory()->create(['role' => 'warga']);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Anda tidak berwenang memproses surat ini.');

        $this->service->approve($letter, $user, ['status' => 'approved']);
    }

    public function test_approve_generates_letter_number_and_expiry(): void
    {
        Notification::fake();

        $letterType = LetterType::factory()->create(['code' => 'ket-domisili', 'validity_days' => 30]);
        $citizen = Citizen::factory()->create();
        $letter = Letter::factory()->create([
            'status' => 'rw_approved',
            'letter_type_id' => $letterType->id,
            'citizen_id' => $citizen->id,
        ]);
        $letter->approvals()->create(['approval_level' => 'kasi', 'deadline_at' => now()->addDays(1)]);

        $user = User::factory()->create(['role' => 'kasi_pelayanan']);

        $this->service->approve($letter, $user, ['status' => 'approved']);

        $letter->refresh();
        $this->assertSame('kasi_approved', $letter->status->value);
        $this->assertNotNull($letter->letter_number);
        $this->assertStringContainsString('KET-DOMISILI', $letter->letter_number);
        $this->assertNotNull($letter->expires_at);
    }

    public function test_approve_reject_does_not_generate_letter_number(): void
    {
        Notification::fake();

        $citizen = Citizen::factory()->create();
        $letter = Letter::factory()->create(['status' => 'rw_approved', 'citizen_id' => $citizen->id]);
        $user = User::factory()->create(['role' => 'kasi_pelayanan']);

        $this->service->approve($letter, $user, ['status' => 'rejected', 'notes' => 'Data tidak lengkap']);

        $letter->refresh();
        $this->assertSame('kasi_rejected', $letter->status->value);
        $this->assertNull($letter->letter_number);
    }
}
