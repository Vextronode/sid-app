<?php

namespace Tests\Feature;

use App\Enums\LetterStatus;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LetterStatusTest extends TestCase
{
    #[Test]
    public function it_has_exactly_four_generic_cases(): void
    {
        $this->assertCount(4, LetterStatus::cases());
    }

    #[Test]
    public function it_supports_all_generic_v5_statuses(): void
    {
        $this->assertSame(LetterStatus::Pending, LetterStatus::from('pending'));
        $this->assertSame(LetterStatus::InProgress, LetterStatus::from('in_progress'));
        $this->assertSame(LetterStatus::Approved, LetterStatus::from('approved'));
        $this->assertSame(LetterStatus::Rejected, LetterStatus::from('rejected'));
    }

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
    public function it_no_longer_has_any_granular_v4_case(): void
    {
        // EV5-5-S1: seluruh case granular per-posisi v4.2 dihapus total --
        // bukan cuma tidak dipakai, tapi benar-benar tidak lagi ada di
        // definisi enum.
        $caseNames = array_map(fn (LetterStatus $case) => $case->name, LetterStatus::cases());

        $granularNamesThatMustNotExist = [
            'RtApproved',
            'RtRejected',
            'RwApproved',
            'RwRejected',
            'KadusApproved',
            'KadusRejected',
            'KasiApproved',
            'KasiRejected',
        ];

        foreach ($granularNamesThatMustNotExist as $granularName) {
            $this->assertNotContains($granularName, $caseNames);
        }
    }

    #[Test]
    public function it_throws_when_constructed_from_a_legacy_granular_value(): void
    {
        // Selaras dengan tests/Unit/LettersMigrationTest.php yang membuktikan
        // DB CHECK constraint menolak nilai ini -- di level PHP pun, value
        // ini sekarang benar-benar tidak valid untuk enum backed string.
        $legacyValues = [
            'rt_approved',
            'rt_rejected',
            'rw_approved',
            'rw_rejected',
            'kadus_approved',
            'kadus_rejected',
            'kasi_approved',
            'kasi_rejected',
        ];

        foreach ($legacyValues as $legacyValue) {
            $this->assertNull(
                LetterStatus::tryFrom($legacyValue),
                "Nilai legacy '{$legacyValue}' seharusnya tidak lagi valid."
            );
        }
    }

    #[Test]
    public function status_predicates_are_consistent_for_every_case(): void
    {
        foreach (LetterStatus::cases() as $case) {
            $this->assertIsBool($case->isApproved());
            $this->assertIsBool($case->isRejected());
            $this->assertIsBool($case->isInProgress());
            $this->assertIsBool($case->isTerminal());
        }
    }

    #[Test]
    public function generic_terminal_statuses_have_correct_predicates(): void
    {
        $this->assertFalse(LetterStatus::Pending->isTerminal());
        $this->assertFalse(LetterStatus::InProgress->isTerminal());
        $this->assertTrue(LetterStatus::InProgress->isInProgress());

        $this->assertTrue(LetterStatus::Approved->isApproved());
        $this->assertTrue(LetterStatus::Approved->isFinalApproval());
        $this->assertTrue(LetterStatus::Approved->isTerminal());

        $this->assertTrue(LetterStatus::Rejected->isRejected());
        $this->assertTrue(LetterStatus::Rejected->isTerminal());
    }

    #[Test]
    public function only_approved_is_a_final_approval(): void
    {
        foreach (LetterStatus::cases() as $case) {
            if ($case === LetterStatus::Approved) {
                $this->assertTrue($case->isFinalApproval());
            } else {
                $this->assertFalse($case->isFinalApproval());
            }
        }
    }
}
