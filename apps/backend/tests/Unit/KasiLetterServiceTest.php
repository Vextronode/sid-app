<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Models\Village;
use App\Repositories\LetterRepository;
use App\Services\KasiLetterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class KasiLetterServiceTest extends TestCase
{
    use RefreshDatabase;

    private KasiLetterService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new KasiLetterService(new LetterRepository);
    }

    public function test_completed_letters_only_returns_approved_and_assigned_to_user_role(): void
    {
        $village = Village::factory()->create();
        $user = $this->makeUserWithOfficialAssignment('kasi_pelayanan', 'kasi_pelayanan', $village->id);
        $expected = $this->makeLetter($village, 'approved', 'kasi_pelayanan');
        $this->makeLetter($village, 'approved', 'kaur_tu_umum');
        $this->makeLetter($village, 'pending', 'kasi_pelayanan');
        $this->makeLetter(Village::factory()->create(), 'approved', 'kasi_pelayanan');

        $result = $this->service->getCompletedLetters($user);

        $this->assertCount(1, $result);
        $this->assertSame($expected->id, $result->first()->id);
    }

    public function test_null_assigned_role_is_visible_to_both_kasi_and_kaur(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'approved', null);

        foreach (['kasi_pelayanan', 'kaur_tu_umum'] as $role) {
            $user = $this->makeUserWithOfficialAssignment($role, $role, $village->id);

            $this->assertSame(
                [$letter->id],
                $this->service->getCompletedLetters($user)->modelKeys(),
            );
        }
    }

    public function test_letter_detail_allows_matching_approved_letter(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'approved', 'kasi_pelayanan');
        $user = $this->makeUserWithOfficialAssignment('kasi_pelayanan', 'kasi_pelayanan', $village->id);

        $this->assertSame($letter->id, $this->service->getLetterDetail($letter, $user)->id);
    }

    public function test_letter_detail_forbids_pending_letter(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'pending', 'kasi_pelayanan');
        $user = User::factory()->create([
            'role' => 'kasi_pelayanan',
            'village_id' => $village->id,
        ]);

        $this->expectException(HttpException::class);
        $this->service->getLetterDetail($letter, $user);
    }

    public function test_letter_detail_forbids_wrong_village_or_assigned_role(): void
    {
        $village = Village::factory()->create();
        $letter = $this->makeLetter($village, 'approved', 'kaur_tu_umum');
        $kasi = $this->makeUserWithOfficialAssignment('kasi_pelayanan', 'kasi_pelayanan', $village->id);

        try {
            $this->service->getLetterDetail($letter, $kasi);
            $this->fail('A mismatched assigned role must not access the letter.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $otherVillage = Village::factory()->create();
        $otherVillageUser = $this->makeUserWithOfficialAssignment('kaur_tu_umum', 'kaur_tu_umum', $otherVillage->id);
        $letter->letterType->update(['assigned_role' => null]);

        $this->expectException(HttpException::class);
        $this->service->getLetterDetail($letter, $otherVillageUser);
    }

    public function test_non_kasi_kaur_role_is_forbidden(): void
    {
        $user = User::factory()->create(['role' => 'rt']);

        $this->expectException(HttpException::class);
        $this->service->getCompletedLetters($user);
    }

    private function makeLetter(Village $village, string $status, ?string $assignedRole): Letter
    {
        $letterType = LetterType::factory()->create(['assigned_role' => $assignedRole]);

        return Letter::factory()->create([
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'status' => $status,
        ]);
    }
}
