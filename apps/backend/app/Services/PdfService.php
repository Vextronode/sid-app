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
    private const SEAL_SIGNATURE_HEIGHT = 60;

    private const SEAL_SIGNATURE_MAX_WIDTH = 160;

    private const SEAL_STAMP_SIZE = 80;

    private const SEAL_WET_WIDTH = 120;

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

        return $this->buildPdf($letter, $template, true)->download("surat-{$letter->id}.pdf");
    }

    public function preview(
        Letter $letter,
        User $user,
        string $template = 'wet'
    ): Response {

        $letter = $this->letterRepository->loadForPdf($letter);

        $this->abortIfExpiredForApplicant($letter, $user);

        // TTD dan stempel Kades hanya untuk surat yang sudah final dan
        // hanya bagi pihak yang berhak mengunduhnya; pihak lain (mis.
        // RT/RW/Kadus) dan surat yang masih diproses mendapat versi
        // tanpa pengesahan.
        $sealed = $letter->status === LetterStatus::Approved && $user->can('download', $letter);

        return $this->buildPdf($letter, $template, $sealed)->stream("surat-{$letter->id}.pdf");
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
            'template' => $this->renderTemplate($letter, $context, 'digital', false, $context['supporting_template']),
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

    private function buildPdf(Letter $letter, string $template, bool $sealed): \Barryvdh\DomPDF\PDF
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
            'template' => $this->renderTemplate($letter, $context, $template, $sealed),
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function renderTemplate(Letter $letter, array $context, string $template, bool $sealed, ?string $source = null): string
    {
        $replacements = $this->getReplacements($letter, $context, $template, $sealed);

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
    private function getReplacements(Letter $letter, array $context, string $template, bool $sealed): array
    {
        $signer = $context['signer'];
        $village = $context['village'];

        // Template wet dicetak lalu ditandatangani dan distempel basah,
        // jadi area tanda tangan dibiarkan kosong.
        $signatureHtml = '';
        if ($sealed && $template === 'digital') {
            $signatureDirectory = "official-signatures/{$signer['village_id']}/{$signer['official_id']}/";
            $signatureHtml = $this->sealHtml(
                $this->privateImagePath($signer['signature_img'] ?? null, $signatureDirectory),
                $this->privateImagePath($village['stamp_img'] ?? null, "village-stamps/{$letter->village_id}/"),
            );
        }

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
            // Snapshot surat lama belum menyimpan pekerjaan pemohon.
            '{{ applicant_occupation }}' => $context['applicant']['occupation'] ?? '-',
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

    /**
     * TTD Kades di tengah area tanda tangan; stempel desa menimpa separuh
     * kiri TTD (tepi kanan stempel tepat di titik tengah TTD). Bila Kades
     * belum mengunggah TTD, stempel diletakkan terhadap area tanda tangan
     * selebar SEAL_WET_WIDTH.
     */
    private function sealHtml(?string $signaturePath, ?string $stampPath): string
    {
        if (! $signaturePath && ! $stampPath) {
            return '';
        }

        $height = self::SEAL_SIGNATURE_HEIGHT;
        [$signatureWidth] = $signaturePath
            ? $this->fitImage($signaturePath, self::SEAL_SIGNATURE_MAX_WIDTH, $height)
            : [self::SEAL_WET_WIDTH, $height];

        $html = '<div style="position: relative; width: '.$signatureWidth.'px; height: '.$height.'px; margin: 0 auto;">';

        if ($signaturePath) {
            [$width, $imageHeight] = $this->fitImage($signaturePath, self::SEAL_SIGNATURE_MAX_WIDTH, $height);
            $html .= '<img src="'.$signaturePath.'" style="width: '.$width.'px; height: '.$imageHeight.'px;">';
        }

        if ($stampPath) {
            [$width, $imageHeight] = $this->fitImage($stampPath, self::SEAL_STAMP_SIZE, self::SEAL_STAMP_SIZE);
            $left = intdiv($signatureWidth, 2) - $width;
            $top = intdiv($height - $imageHeight, 2);
            $html .= '<img src="'.$stampPath.'" style="position: absolute; left: '.$left.'px; top: '.$top.'px; width: '.$width.'px; height: '.$imageHeight.'px;">';
        }

        return $html.'</div>';
    }

    /**
     * Ukuran tampil gambar (proporsional) di dalam kotak maxWidth x maxHeight.
     *
     * @return array{0: int, 1: int}
     */
    private function fitImage(string $absolutePath, int $maxWidth, int $maxHeight): array
    {
        $size = @getimagesize($absolutePath);
        if (! $size || $size[0] <= 0 || $size[1] <= 0) {
            return [$maxWidth, $maxHeight];
        }

        $scale = min($maxWidth / $size[0], $maxHeight / $size[1]);

        return [max(1, (int) round($size[0] * $scale)), max(1, (int) round($size[1] * $scale))];
    }

    /**
     * Path absolut file private yang tervalidasi berada di direktori
     * miliknya, atau null bila tidak valid/tidak ada.
     */
    private function privateImagePath(?string $path, string $directory): ?string
    {
        if (
            ! $path
            || ! str_starts_with($path, $directory)
            || ! Storage::disk('private_uploads')->exists($path)
        ) {
            return null;
        }

        return Storage::disk('private_uploads')->path($path);
    }
}
