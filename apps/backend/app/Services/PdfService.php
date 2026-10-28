<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\User;
use App\Models\UserSignature;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Support\LetterDocuments;
use App\Support\LetterValueFormatter;
use App\Support\TemplateConditionals;
use App\Support\TemplateLoops;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PdfService
{
    private const SEAL_SIGNATURE_HEIGHT = 60;

    private const SEAL_SIGNATURE_MAX_WIDTH = 160;

    private const SEAL_STAMP_SIZE = 80;

    private const SEAL_WET_WIDTH = 120;

    private const SERVICE_SIGNATURE_HEIGHT = 45;

    private const SERVICE_SIGNATURE_MAX_WIDTH = 130;

    public function __construct(
        protected OfficialRepository $officialRepository,
        protected LetterRepository $letterRepository,
        protected LetterSnapshotService $letterSnapshotService,
        protected LetterSignatureService $letterSignatureService,
        protected UserSignatureService $userSignatureService,
    ) {}

    public function download(
        Letter $letter,
        User $user,
        string $template = 'wet',
        ?string $document = null,
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

        [$pdf, $filename] = $this->buildPdf($letter, $template, true, $document);

        return $pdf->download($filename);
    }

    public function preview(
        Letter $letter,
        User $user,
        string $template = 'wet',
        ?string $document = null,
    ): Response {

        $letter = $this->letterRepository->loadForPdf($letter);

        $this->abortIfExpiredForApplicant($letter, $user);

        // TTD dan stempel Kades hanya untuk surat yang sudah final dan
        // hanya bagi pihak yang berhak mengunduhnya; pihak lain (mis.
        // RT/RW/Kadus) dan surat yang masih diproses mendapat versi
        // tanpa pengesahan.
        $sealed = $letter->status === LetterStatus::Approved && $user->can('download', $letter);

        [$pdf, $filename] = $this->buildPdf($letter, $template, $sealed, $document);

        return $pdf->stream($filename);
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
     * pejabat dan Staf SIDUTama tetap dapat membuka PDF untuk arsip.
     */
    private function abortIfExpiredForApplicant(Letter $letter, User $user): void
    {
        if ($letter->submitted_by === $user->id && $letter->isExpired()) {
            abort(403, 'Masa berlaku surat telah habis.');
        }
    }

    /**
     * @return array{0: \Barryvdh\DomPDF\PDF, 1: string} PDF dan nama berkasnya
     */
    private function buildPdf(Letter $letter, string $template, bool $sealed, ?string $documentKey): array
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

        $document = $this->documentFor($letter, $context, $documentKey);
        $filename = $document['key'] === LetterDocuments::MAIN
            ? "surat-{$letter->id}.pdf"
            : "surat-{$letter->id}-{$document['key']}.pdf";

        // Formulir Disdukcapil berkotak (mis. F-2.01) butuh memori lebih.
        if (self::memoryLimitBytes() < 512 * 1024 * 1024) {
            ini_set('memory_limit', '512M');
        }

        $pdf = Pdf::loadView($view, [
            'letter' => $letter,
            'kades' => $kades,
            'template' => $this->renderTemplate($letter, $context, $template, $sealed, (string) $document['template']),
        ]);

        if ($document['orientation'] === 'landscape') {
            $pdf->setPaper('a4', 'landscape');
        }

        return [$pdf, $filename];
    }

    private static function memoryLimitBytes(): int
    {
        $limit = trim((string) ini_get('memory_limit'));

        if ($limit === '-1') {
            return PHP_INT_MAX;
        }

        $value = (int) $limit;

        return match (strtolower(substr($limit, -1))) {
            'g' => $value * 1024 ** 3,
            'm' => $value * 1024 ** 2,
            'k' => $value * 1024,
            default => $value,
        };
    }

    /**
     * Dokumen yang diminta harus termasuk dokumen yang terbit untuk surat
     * ini (syaratnya terpenuhi oleh jawaban form). Snapshot lama belum
     * menyimpan daftar dokumen, jadi memakai definisi jenis surat.
     *
     * @param  array<string, mixed>  $context
     * @return array{key: string, title: string, template: string|null, orientation: string}
     */
    private function documentFor(Letter $letter, array $context, ?string $key): array
    {
        $documents = LetterDocuments::applicable(
            (string) ($context['title'] ?? $letter->letterType?->name),
            $context['template'] ?? null,
            $context['documents'] ?? $letter->letterType?->documents,
            is_array($letter->payload) ? $letter->payload : [],
        );

        return LetterDocuments::find($documents, $key)
            ?? abort(404, 'Dokumen ini tidak terbit untuk surat ini.');
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function renderTemplate(Letter $letter, array $context, string $template, bool $sealed, ?string $source = null): string
    {
        $replacements = $this->getReplacements($letter, $context, $template, $sealed);

        // Blok {{#each ...}} dan {{#if ...}} dinilai dari jawaban form
        // sebelum placeholder diganti.
        $payload = is_array($letter->payload) ? $letter->payload : [];
        $templateHtml = str_replace(
            array_keys($replacements),
            array_values($replacements),
            TemplateConditionals::apply(
                TemplateLoops::apply(
                    (string) ($source ?? $context['template'] ?? ''),
                    $context['form_fields'] ?? $letter->letterType?->form_fields ?? [],
                    // Baris sistem: rincian KK pemohon saat surat dibuat/terbit.
                    [...$payload, 'kk_anggota' => $context['applicant']['family_members'] ?? []],
                ),
                $payload,
            )
        );

        // Formulir Disdukcapil: {{ a|b }} = nilai pertama yang terisi (mis.
        // ayah dari KK atau ayah yang diketik), {{ isian[0] }} = satu karakter
        // untuk kotak per huruf. Keduanya kosong bila tidak ada nilai.
        $templateHtml = (string) preg_replace_callback(
            '/\{\{\s*([a-zA-Z0-9_]+(?:\|[a-zA-Z0-9_]+)*)(?:\[(\d+)\])?\s*}}/',
            function (array $match) use ($replacements): string {
                $names = explode('|', $match[1]);
                $index = $match[2] ?? '';

                if (count($names) === 1 && $index === '') {
                    return $match[0];
                }

                foreach ($names as $name) {
                    $html = (string) ($replacements["{{ {$name} }}"] ?? '');
                    $value = trim(html_entity_decode(strip_tags($html)));
                    // Kotak jam: "08:30" dicetak 0 8 3 0.
                    $value = $index === '' ? $value : str_replace(':', '', $value);

                    if ($value !== '' && ! preg_match('/^_+$/', $value)) {
                        // Kotak formulir diisi huruf cetak (kapital).
                        return $index === '' ? $html : e(mb_strtoupper(mb_substr($value, (int) $index, 1)));
                    }
                }

                return '';
            },
            $templateHtml,
        );

        // TTD formulir pelayanan yang tidak ada (belum diisi, surat belum
        // final, atau penanda tangan bukan pemohon) dibiarkan kosong.
        $templateHtml = (string) preg_replace('/\{\{\s*tanda_tangan_[a-z0-9_]+\s*}}/', '', $templateHtml);

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
        if ($sealed && $template === 'digital' && ($signer['official_id'] ?? null) !== null) {
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
            '{{ applicant_marital_status }}' => $context['applicant']['marital_status'] ?? '-',
            '{{ applicant_family_number }}' => $context['applicant']['family_number'] ?? '________________________',
            '{{ applicant_email }}' => (string) ($context['applicant']['email'] ?? ''),
            '{{ village_kasi_pemerintahan_name }}' => $context['village']['kasi_pemerintahan_name'] ?? '________________________',
            '{{ purpose }}' => $letter->purpose ?? '________________________________________',
            '{{ submitted_at }}' => $context['submitted_at'],
            '{{ issued_at }}' => $context['issued_at'] ?? $context['submitted_at'],
            ...$this->issuedDateParts((string) ($context['issued_at'] ?? $context['submitted_at'])),
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
            '{{ village_area_code }}' => self::areaCode((string) ($village['code'] ?? '')),
            '{{ village_email }}' => (string) ($village['email'] ?? ''),
            '{{ village_head_name }}' => $signer['name'] ?? '________________________________________',
        ];

        // Slot tanda tangan warga: {{ nama_ttd_<slot> }} dan {{ ttd_<slot> }}.
        // Versi TTD basah dicetak lalu ditandatangani: gambarnya kosong.
        $signatureImages = [];
        foreach ($this->letterSignatureService->renderData($letter) as $slotKey => $signature) {
            $textReplacements["{{ nama_ttd_{$slotKey} }}"] = $signature['name'];
            $signatureImages["{{ ttd_{$slotKey} }}"] = match (true) {
                $template !== 'digital' => '',
                $signature['image'] !== null => '<img src="'.$signature['image'].'" style="max-height: 60px; width: auto;">',
                $signature['method'] === 'wet' => '<em>(tanda tangan basah terlampir)</em>',
                default => '',
            };
        }

        [$serviceText, $serviceImages] = $this->serviceSignatureReplacements(
            $letter,
            $context['service_signatures'] ?? [],
            $sealed && $template === 'digital',
        );
        $textReplacements = [...$textReplacements, ...$serviceText];

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

        return [...$payloadHtml, ...$replacements, ...$signatureImages, ...$serviceImages];
    }

    /**
     * Bagian tanggal terbit untuk kalimat "Pada hari ini ... tanggal ...
     * Bulan ... tahun ..." (F-1.07): {{ issued_day_name }} "Senin",
     * {{ issued_day }} "12", {{ issued_month }} "Oktober", {{ issued_year }};
     * dan {{ issued_tgl/_bln/_thn }} "12"/"10"/"2026" untuk kotak tanggal.
     *
     * @return array<string, string>
     */
    private function issuedDateParts(string $issuedAt): array
    {
        try {
            $date = Carbon::createFromLocaleFormat('j F Y', 'id', $issuedAt)->locale('id');
        } catch (\Throwable) {
            $date = null;
        }

        return [
            '{{ issued_day_name }}' => $date?->translatedFormat('l') ?? '..........',
            '{{ issued_day }}' => $date?->format('j') ?? '.....',
            '{{ issued_month }}' => $date?->translatedFormat('F') ?? '..........',
            '{{ issued_year }}' => $date?->format('Y') ?? '.....',
            // Kotak tanggal formulir Disdukcapil: 2 digit tanggal & bulan.
            '{{ issued_tgl }}' => $date?->format('d') ?? '',
            '{{ issued_bln }}' => $date?->format('m') ?? '',
            '{{ issued_thn }}' => $date?->format('Y') ?? '',
        ];
    }

    /**
     * Kode wilayah 8 kotak formulir Disdukcapil (2 digit provinsi,
     * kabupaten, kecamatan, desa) dari kode desa Kemendagri 10 digit
     * (mis. 3218032001 -> 32180301). Kode lain dipakai apa adanya.
     */
    private static function areaCode(string $code): string
    {
        $digits = preg_replace('/\D/', '', $code) ?? '';

        return strlen($digits) === 10 ? substr($digits, 0, 6).substr($digits, -2) : $digits;
    }

    /**
     * Formulir pelayanan (Fxx): nama/NIK pejabat penanda tangan dan TTD
     * yang ditempel saat surat final (snapshot service_signatures).
     *  - {{ tanda_tangan_pemohon }}: TTD akun pemohon.
     *  - {{ tanda_tangan_pemohon_bila_<isian> }}: TTD pemohon bila NIK di
     *    isian itu NIK pemohon (mis. ibu/suami/kepala keluarga = pemohon).
     *  - {{ tanda_tangan_kepala_desa }}, {{ tanda_tangan_kasi_pemerintahan }}.
     *  - {{ tanda_tangan_rt_<area> }}, {{ tanda_tangan_rw_<area> }} dan
     *    {{ pejabat_rt_<area>_nama }}/{{ pejabat_rt_<area>_nik }} (juga rw):
     *    Ketua RT/RW wilayah isian village_area.
     * Penanda tangan yang belum punya TTD dibiarkan kosong.
     *
     * @param  array<string, mixed>  $signatures
     * @return array{0: array<string, string>, 1: array<string, string>} teks dan HTML gambar
     */
    private function serviceSignatureReplacements(Letter $letter, array $signatures, bool $sealed): array
    {
        $text = [
            '{{ pejabat_kepala_desa_nama }}' => $signatures['kepala_desa']['name'] ?? '................................',
        ];
        $images = [];
        $official = function (?array $official) use ($sealed): string {
            if (! $sealed || $official === null) {
                return '';
            }

            $path = $this->privateImagePath(
                $official['signature_img'] ?? null,
                "official-signatures/{$official['village_id']}/{$official['official_id']}/",
            );

            return $path === null ? '' : $this->signatureOverlay($path, @getimagesize($path) ?: null);
        };

        $images['{{ tanda_tangan_kepala_desa }}'] = $official($signatures['kepala_desa'] ?? null);
        $images['{{ tanda_tangan_kasi_pemerintahan }}'] = $official($signatures['kasi_pemerintahan'] ?? null);

        foreach ($signatures['areas'] ?? [] as $area => $officials) {
            foreach (['rt', 'rw'] as $level) {
                $text["{{ pejabat_{$level}_{$area}_nama }}"] = $officials[$level]['name'] ?? '.............................................';
                $text["{{ pejabat_{$level}_{$area}_nik }}"] = $officials[$level]['nik'] ?? '......................................';
                $images["{{ tanda_tangan_{$level}_{$area} }}"] = $official($officials[$level] ?? null);
            }
        }

        $signature = $sealed && isset($signatures['applicant_signature_id'])
            ? UserSignature::query()->find($signatures['applicant_signature_id'])
            : null;
        $dataUri = $signature !== null ? $this->userSignatureService->dataUri($signature) : null;

        if ($dataUri !== null) {
            $applicant = $this->signatureOverlay($dataUri, @getimagesize($dataUri) ?: null);
            $images['{{ tanda_tangan_pemohon }}'] = $applicant;
            $nik = (string) $letter->applicant_nik;

            foreach (is_array($letter->payload) ? $letter->payload : [] as $key => $value) {
                if ($nik !== '' && is_string($value) && $value === $nik) {
                    $images["{{ tanda_tangan_pemohon_bila_{$key} }}"] = $applicant;
                }
            }
        }

        return [$text, $images];
    }

    /**
     * Gambar TTD yang "melayang" di atas nama penanda tangan, di ruang
     * kosong tanda tangan formulir, tanpa mengubah tinggi tata letaknya.
     *
     * @param  array<int, mixed>|null  $size  hasil getimagesize
     */
    private function signatureOverlay(string $src, ?array $size): string
    {
        [$width, $height] = [self::SERVICE_SIGNATURE_MAX_WIDTH, self::SERVICE_SIGNATURE_HEIGHT];

        if ($size !== null && $size[0] > 0 && $size[1] > 0) {
            $scale = min($width / $size[0], $height / $size[1]);
            [$width, $height] = [max(1, (int) round($size[0] * $scale)), max(1, (int) round($size[1] * $scale))];
        }

        // Margin atas negatif setinggi gambar: tinggi bersihnya nol.
        return '<div style="margin-top: -'.($height + 2).'px; height: '.($height + 2).'px; text-align: center;">'
            .'<img src="'.$src.'" style="width: '.$width.'px; height: '.$height.'px;"></div>';
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
