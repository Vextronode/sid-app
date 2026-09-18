<?php

namespace Tests\Feature;

use App\Enums\LetterStatus;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LetterStatusTest extends TestCase
{
    #[Test]
    public function it_does_not_have_waiting_revision_warga_case(): void
    {
        $caseNames = array_map(fn (LetterStatus $case) => $case->name, LetterStatus::cases());

        $this->assertNotContains('WaitingRevisionWarga', $caseNames);
    }

    #[Test]
    public function it_does_not_have_rejected_revision_case(): void
    {
        $caseNames = array_map(fn (LetterStatus $case) => $case->name, LetterStatus::cases());

        $this->assertNotContains('RejectedRevision', $caseNames);
    }

    #[Test]
    public function it_supports_all_generic_v5_statuses(): void
    {
        $this->assertSame(LetterStatus::Pending, LetterStatus::from('pending'));
        $this->assertSame(LetterStatus::InProgress, LetterStatus::from('in_progress'));
        $this->assertSame(LetterStatus::Approved, LetterStatus::from('approved'));
        $this->assertSame(LetterStatus::Rejected, LetterStatus::from('rejected'));
    }

    #[DataProvider('legacyGranularCasesThatMustStillExist')]
    #[Test]
    public function granular_v4_cases_still_exist_until_downstream_services_are_migrated(string $caseName): void
    {
        $caseNames = array_map(fn (LetterStatus $case) => $case->name, LetterStatus::cases());

        $this->assertContains($caseName, $caseNames);
    }

    public static function legacyGranularCasesThatMustStillExist(): array
    {
        return [
            'RtApproved' => ['RtApproved'],
            'RtRejected' => ['RtRejected'],
            'RwApproved' => ['RwApproved'],
            'RwRejected' => ['RwRejected'],
            'KadusApproved' => ['KadusApproved'],
            'KadusRejected' => ['KadusRejected'],
            'KasiApproved' => ['KasiApproved'],
            'KasiRejected' => ['KasiRejected'],
        ];
    }

    #[Test]
    public function it_has_exactly_eleven_cases_after_ev5_4_s6_adds_the_generic_ones(): void
    {
        // 11 case lama - 2 case revisi (WaitingRevisionWarga, RejectedRevision)
        // + 2 case generik baru (Approved, Rejected - dipakai
        // KasiApprovalService mulai EV5-4-S6) = 11.
        $this->assertCount(11, LetterStatus::cases());
    }

    #[Test]
    public function it_has_the_generic_approved_and_rejected_cases_added_by_ev5_4_s6(): void
    {
        $caseNames = array_map(fn (LetterStatus $c) => $c->name, LetterStatus::cases());

        $this->assertContains('Approved', $caseNames);
        $this->assertContains('Rejected', $caseNames);
    }

    #[Test]
    public function status_predicates_are_consistent_for_every_case(): void
    {
        foreach (LetterStatus::cases() as $case) {
            $this->assertIsBool($case->isApproved());
            $this->assertIsBool($case->isRejected());
        }
    }

    #[Test]
    public function generic_terminal_statuses_have_correct_predicates(): void
    {
        $this->assertFalse(LetterStatus::InProgress->isTerminal());
        $this->assertTrue(LetterStatus::Approved->isApproved());
        $this->assertTrue(LetterStatus::Approved->isFinalApproval());
        $this->assertTrue(LetterStatus::Approved->isTerminal());
        $this->assertTrue(LetterStatus::Rejected->isRejected());
        $this->assertTrue(LetterStatus::Rejected->isTerminal());
    }

    #[Test]
    public function kasi_approved_remains_a_legacy_final_approval_during_transition(): void
    {
        $this->assertTrue(LetterStatus::KasiApproved->isFinalApproval());
        $this->assertTrue(LetterStatus::KasiApproved->isTerminal());
    }

    #[Test]
    public function generic_approved_is_a_final_approval_and_generic_rejected_is_terminal(): void
    {
        // EV5-4-S6: KasiApprovalService sekarang menulis status generik
        // ini, bukan lagi KasiApproved/KasiRejected.
        $this->assertTrue(LetterStatus::Approved->isFinalApproval());
        $this->assertTrue(LetterStatus::Approved->isTerminal());
        $this->assertTrue(LetterStatus::Rejected->isTerminal());
        $this->assertTrue(LetterStatus::Rejected->isRejected());
    }
}
