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
    public function it_has_twelve_cases_during_the_v5_transition(): void
    {
        // Empat status generik v5 dan delapan status granular yang masih
        // dipakai data lama sampai EV5-4-S9 selesai.
        $this->assertCount(12, LetterStatus::cases());
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
        // KasiApprovalService (EV5-4-S6) tidak lagi MENULIS nilai ini
        // (lihat Approved di atas), tapi baris lama yang sudah
        // terlanjur tersimpan dengan status ini tetap harus
        // diklasifikasikan benar oleh isFinalApproval()/isTerminal().
        $this->assertTrue(LetterStatus::KasiApproved->isFinalApproval());
        $this->assertTrue(LetterStatus::KasiApproved->isTerminal());
    }
}
