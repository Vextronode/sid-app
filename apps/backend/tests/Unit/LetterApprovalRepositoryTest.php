<?php

namespace Tests\Unit;

use App\Models\Letter;
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

        $result = $this->repository->findLatestPendingByLevel($letter, 'rw');

        $this->assertNull($result);
    }

    public function test_find_latest_pending_by_level_returns_pending_approval(): void
    {
        $letter = Letter::factory()->create();
        $approval = $letter->approvals()->create([
            'approval_level' => 'rw',
            'deadline_at' => now()->addDays(3),
        ]);

        $result = $this->repository->findLatestPendingByLevel($letter, 'rw');

        $this->assertSame($approval->id, $result->id);
    }

    public function test_update_approved_by_sets_approver(): void
    {
        $letter = Letter::factory()->create();
        $approval = $letter->approvals()->create([
            'approval_level' => 'rw',
            'deadline_at' => now()->addDays(3),
        ]);

        $updated = $this->repository->updateApprovedBy($approval, 42);

        $this->assertSame(42, $updated->approved_by);
        $this->assertDatabaseHas('letter_approvals', ['id' => $approval->id, 'approved_by' => 42]);
    }
}
