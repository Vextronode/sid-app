<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\User;
use App\Repositories\LetterApprovalRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterApprovalRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private LetterApprovalRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new LetterApprovalRepository;
    }

    public function test_find_latest_pending_by_level_returns_null_when_none_pending(): void
    {
        $letter = Letter::factory()->create();

        $result = $this->repository->findLatestPendingByLevel($letter, 'kepala_desa');

        $this->assertNull($result);
    }

    public function test_find_latest_pending_by_level_returns_pending_approval(): void
    {
        $letter = Letter::factory()->create();
        $approval = $letter->approvals()->create([
            // 🔍 EV5-2-S2: 'rw' dihapus dari ENUM approval_level (RW
            // bukan approver sejak v5.0). Diganti 'kepala_desa' — nilai
            // ENUM valid berikutnya di posisi setara (step approver
            // aktif kedua di flow default), murni untuk menjaga test ini
            // tetap bisa dijalankan terhadap skema baru. Rewrite intent
            // penuh (Kades/Sekdes service) tetap scope EV5-4-S5.
            'approval_level' => 'kepala_desa',
            'deadline_at' => now()->addDays(3),
        ]);

        $result = $this->repository->findLatestPendingByLevel($letter, 'kepala_desa');

        $this->assertSame($approval->id, $result->id);
    }

    public function test_update_approved_by_sets_approver(): void
    {
        $letter = Letter::factory()->create();
        $approval = $letter->approvals()->create([
            'approval_level' => 'kepala_desa',
            'deadline_at' => now()->addDays(3),
        ]);
        $approver = User::factory()->create();

        $updated = $this->repository->updateApprovedBy($approval, $approver->id);

        $this->assertSame($approver->id, $updated->approved_by);
        $this->assertDatabaseHas('letter_approvals', ['id' => $approval->id, 'approved_by' => $approver->id]);
    }
}
