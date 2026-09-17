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
        $caseNames = array_map(fn (LetterStatus $c) => $c->name, LetterStatus::cases());

        $this->assertNotContains('WaitingRevisionWarga', $caseNames);
    }

    #[Test]
    public function it_does_not_have_rejected_revision_case(): void
    {
        $caseNames = array_map(fn (LetterStatus $c) => $c->name, LetterStatus::cases());

        $this->assertNotContains('RejectedRevision', $caseNames);
    }

    #[DataProvider('legacyGranularCasesThatMustStillExist')]
    #[Test]
    public function granular_v4_cases_still_exist_because_downstream_services_are_not_migrated_yet(string $caseName): void
    {
        // EV5-0-S1 TIDAK boleh menghapus case ini — RwApprovalService,
        // KasiApprovalService, PdfService, dan cast model Letter/
        // LetterStatusLog masih memakainya. Penghapusan case granular
        // adalah scope EV5-5 (setelah EV5-2/EV5-4 selesai rewrite
        // service-nya), bukan hari ini.
        $caseNames = array_map(fn (LetterStatus $c) => $c->name, LetterStatus::cases());

        $this->assertContains($caseName, $caseNames);
    }

    public static function legacyGranularCasesThatMustStillExist(): array
    {
        return [
            'Pending' => ['Pending'],
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
    public function is_approved_and_is_rejected_no_longer_reference_removed_revision_cases(): void
    {
        // isRejected()/isApproved() harus tetap konsisten setelah 2 case
        // dihapus — tidak boleh melempar error saat dipanggil di case
        // manapun yang tersisa.
        foreach (LetterStatus::cases() as $case) {
            $this->assertIsBool($case->isApproved());
            $this->assertIsBool($case->isRejected());
        }
    }

    #[Test]
    public function kasi_approved_is_still_a_final_approval_for_legacy_data(): void
    {
        // KasiApprovalService tidak lagi MENULIS nilai ini (lihat
        // Approved di bawah), tapi baris lama yang sudah terlanjur
        // tersimpan dengan status ini tetap harus diklasifikasikan
        // benar oleh isFinalApproval()/isTerminal().
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
