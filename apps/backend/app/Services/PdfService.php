<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Support\LetterValueFormatter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PdfService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected LetterRepository $letterRepository,
        protected LetterSnapshotService $letterSnapshotService,
        protected LetterSignatureService $letterSignatureService,
    ) {}

    public function download(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter = $this->letterRepository->loadForPdf($letter);

        /**
         * EV5-4-S9. Guard generik: hanya bisa download jika status
         * surat sudah 'approved' (bukan lagi KasiApproved granular v4.2
         * - lihat paths/letters/download.yaml).
         */
        if ($letter->status !== LetterStatus::Approved) {
            abort(403, 'Surat baru dapat diunduh setelah seluruh proses persetujuan selesai.');
        }

        $this->abortIfExpiredForApplicant($letter, $user);

        return $this->buildPdf($letter, $template)->download("surat-{$letter->id}.pdf");
    }

    public function preview(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter = $this->letterRepository->loadForPdf($letter);

        $this->abortIfExpiredForApplicant($letter, $user);

        return $this->buildPdf($letter, $template)->stream("surat-{$letter->id}.pdf");
    }

    /**
     * Dokumen pendukung yang digenerate dari isian form (mis. surat
     * pernyataan), lengkap dengan tanda tangan pemohon dan pihak terkait.
     * Dipakai approver dan Kasi/Kaur sebagai bahan pertimbangan.
     */
    public function supportingDocument(Letter $letter, bool $download): Response
    {
        $letter = $this->letterRepository->loadForPdf($letter);
        $context = $this->letterSnapshotService->supportingContextFor($letter);

        if (! $context['supporting_template']) {
            abort(404, 'Jenis surat ini tidak memiliki dokumen pendukung.');
        }

        $pdf = Pdf::loadView('pdf.templates.digital', [
            'letter' => $letter,
            'kades' => null,
            'template' => $this->renderTemplate($letter, $context, 'digital', $context['supporting_template']),
        ]);
        $filename = "dokumen-pendukung-{$letter->id}.pdf";

        return $download ? $pdf->download($filename) : $pdf->stream($filename);
    }

    /**
     * Surat kedaluwarsa hanya tersimpan sebagai riwayat bagi pemohon;
     * pejabat dan Petugas Desa tetap dapat membuka PDF untuk arsip.
     */
    private function abortIfExpiredForApplicant(Letter $letter, User $user): void
    {
        if ($letter->submitted_by === $user->id && $letter->isExpired()) {
            abort(403, 'Masa berlaku surat telah habis.');
        }
    }

    private function buildPdf(Letter $letter, string $template): \Barryvdh\DomPDF\PDF
    {
        // Surat approved dirender dari snapshot final approve; tanda tangan
        // dan stempel milik Kepala Desa yang menjabat saat itu, termasuk
        // jika Sekdes yang menyetujui surat.
        $context = $this->letterSnapshotService->contextFor($letter);
        $kades = $this->letterSnapshotService->signerFor($letter, $context);

        if (! $letter->letterType) {
            abort(500, 'Template surat tidak ditemukan. Hubungi administrator.');
        }

        $view = match ($template) {
            'digital' => 'pdf.templates.digital',
            default => 'pdf.templates.wet',
        };

        return Pdf::loadView($view, [
            'letter' => $letter,
            'kades' => $kades,
            'template' => $this->renderTemplate($letter, $context, $template),
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function renderTemplate(Letter $letter, array $context, string $template, ?string $source = null): string
    {
        $replacements = $this->getReplacements($letter, $context, $template);

        $templateHtml = str_replace(
            array_keys($replacements),
            array_values($replacements),
            (string) ($source ?? $context['template'] ?? '')
        );

        // Replace any unmapped {{ placeholder }} tags with fallback underline line
        return preg_replace('/\{\{\s*([a-zA-Z0-9_]+)\s*}}/', '________________________', $templateHtml);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function getReplacements(Letter $letter, array $context, string $template): array
    {
        $signer = $context['signer'];
        $village = $context['village'];

        $signatureHtml = '';
        $signatureDirectory = "official-signatures/{$signer['village_id']}/{$signer['official_id']}/";
        if ($template === 'digital') {
            $signatureHtml .= $this->privateImage($signer['signature_img'] ?? null, $signatureDirectory, 'max-height: 60px; width: auto;');
        }
        $signatureHtml .= $this->privateImage(
            $village['stamp_img'] ?? null,
            "village-stamps/{$letter->village_id}/",
            'max-height: 45px; width: auto; margin-left: 10px;',
        );

        $logoPath = public_path('images/logo-pangandaran.png');
        $logoHtml = file_exists($logoPath)
            ? '<img src="'.$logoPath.'" style="width: 75px; height: auto;">'
            : '';

        // Kop surat dan wilayah administratif diambil dari profil desa.
        $villageName = (string) ($village['name'] ?? '');
        $villageShort = preg_replace('/^Desa\s+/i', '', $villageName);
        $district = (string) ($village['district'] ?? '');
        $regency = (string) ($village['regency'] ?? '');
        $province = (string) ($village['province'] ?? '');
        $villageRegion = implode(' ', array_filter([
            $villageShort !== '' ? "Desa {$villageShort}" : null,
            $district !== '' ? "Kecamatan {$district}" : null,
            $regency !== '' ? "Kabupaten {$regency}" : null,
            $province !== '' ? $province : null,
        ]));

        // logo_img dan signature_img adalah HTML buatan sistem; nilai lain
        // berasal dari data warga/isian form dan wajib di-escape karena
        // template dirender mentah ({!! $template !!}).
        $textReplacements = [
            '{{ letter_number }}' => $letter->letter_number ?? '470/      /Des/      /20',
            '{{ applicant_name }}' => $letter->applicant_name ?? '________________________________________',
            '{{ applicant_nik }}' => $letter->applicant_nik ?? '________________________________________',
            '{{ applicant_address }}' => $letter->applicant_address ?? '________________________________________',
            '{{ applicant_gender }}' => $context['applicant']['gender'],
            '{{ applicant_birth_place_date }}' => $context['applicant']['birth_place_date'],
            '{{ purpose }}' => $letter->purpose ?? '________________________________________',
            '{{ submitted_at }}' => $context['submitted_at'],
            '{{ issued_at }}' => $context['issued_at'] ?? $context['submitted_at'],
            '{{ applicant_resident_phrase }}' => $context['applicant']['resident_phrase']
                ?? 'benar-benar warga masyarakat Desa kami, dan',
            '{{ village_name }}' => $villageName,
            '{{ village_name_short }}' => $villageShort,
            '{{ village_name_upper }}' => mb_strtoupper($villageShort),
            '{{ village_district }}' => $district,
            '{{ village_district_upper }}' => mb_strtoupper($district),
            '{{ village_regency }}' => $regency,
            '{{ village_regency_upper }}' => mb_strtoupper($regency),
            '{{ village_province }}' => $province,
            '{{ village_region }}' => $villageRegion,
            '{{ village_address }}' => (string) ($village['address'] ?? ''),
            '{{ village_phone }}' => (string) ($village['phone'] ?? ''),
            '{{ village_postal_code }}' => (string) ($village['postal_code'] ?? ''),
            '{{ village_email }}' => (string) ($village['email'] ?? ''),
            '{{ village_head_name }}' => $signer['name'] ?? '________________________________________',
        ];

        // Slot tanda tangan warga: {{ nama_ttd_<slot> }} dan {{ ttd_<slot> }}.
        $signatureImages = [];
        foreach ($this->letterSignatureService->renderData($letter) as $slotKey => $signature) {
            $textReplacements["{{ nama_ttd_{$slotKey} }}"] = $signature['name'];
            $signatureImages["{{ ttd_{$slotKey} }}"] = match (true) {
                $signature['image'] !== null => '<img src="'.$signature['image'].'" style="max-height: 60px; width: auto;">',
                $signature['method'] === 'wet' => '<em>(tanda tangan basah terlampir)</em>',
                default => '',
            };
        }

        // Isian form diformat menurut tipenya (tanggal, rupiah + terbilang,
        // pilihan, teks panjang). Isian tidak boleh menimpa placeholder
        // milik sistem (nomor surat, nama Kades, dsb.).
        $formatted = LetterValueFormatter::format(
            $context['form_fields'] ?? $letter->letterType?->form_fields ?? [],
            is_array($letter->payload) ? $letter->payload : [],
        );
        $payloadHtml = [];

        foreach ($formatted['text'] as $key => $value) {
            if (! isset($textReplacements["{{ {$key} }}"])) {
                $textReplacements["{{ {$key} }}"] = $value;
            }
        }

        foreach ($formatted['html'] as $key => $value) {
            if (! isset($textReplacements["{{ {$key} }}"])) {
                $payloadHtml["{{ {$key} }}"] = $value;
            }
        }

        $replacements = array_map(fn ($value) => e((string) $value), $textReplacements);
        $replacements['{{ logo_img }}'] = $logoHtml;
        $replacements['{{ signature_img }}'] = $signatureHtml;

        return [...$payloadHtml, ...$replacements, ...$signatureImages];
    }

    private function privateImage(?string $path, string $directory, string $style): string
    {
        if (
            ! $path
            || ! str_starts_with($path, $directory)
            || ! Storage::disk('private_uploads')->exists($path)
        ) {
            return '';
        }

        return '<img src="'.Storage::disk('private_uploads')->path($path).'" style="'.$style.'">';
    }
}
