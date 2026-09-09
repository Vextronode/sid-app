<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\Official;
use App\Repositories\LetterApprovalRepository;
use App\Repositories\LetterRepository;
use App\Services\LetterApprovalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class clsLetterApprovalServiceTest extends TestCase
{
    use RefreshDatabase;

    private LetterApprovalService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new LetterApprovalService(
            new LetterApprovalRepository,
            new LetterRepository,
        );
    }

    public function test_approve_throws_when_letter_already_processed(): void
    {
        $official = Official::factory()->create(['is_active' => true]);
        $letter = Letter::factory()->create(['status' => 'rw_approved']);

        $this->expectException(ValidationException::class);

        $this->service->approve($letter, $official, 'rw_approved');
    }

    public function test_approve_throws_when_official_inactive(): void
    {
        $official = Official::factory()->create(['is_active' => false]);
        $letter = Letter::factory()->create(['status' => 'pending']);

        $this->expectException(ValidationException::class);

        $this->service->approve($letter, $official, 'rw_approved');
    }
}
