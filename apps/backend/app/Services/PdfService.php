<?php

namespace App\Services;

use App\Enums\LetterStatus;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\User;
use App\Repositories\LetterRepository;
use App\Support\LetterDocuments;
use App\Support\LetterValueFormatter;
use App\Support\PaperSize;
use App\Support\TemplateConditionals;
use App\Support\TemplateLoops;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * PDF surat tanpa gambar tanda tangan dan stempel: surat terbit dicetak
 * petugas desa lalu ditandatangani dan distempel basah. Ruang tanda tangan
 * dibiarkan kosong, nama penanda tangan tetap tercetak.
 */
class PdfService
{
    private const VIEW = 'pdf.templates.letter';

    public function __construct(
        protected LetterRepository $letterRepository,
        protected LetterSnapshotService $letterSnapshotService,
    ) {}

    public function download(Letter $letter, User $user, ?string $document = null): Response
    {
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

        [$pdf, $filename] = $this->buildPdf($letter, $document);

        return $pdf->download($filename);
    }

    public function preview(Letter $letter, User $user, ?string $document = null): Response
    {
        $letter = $this->letterRepository->loadForPdf($letter);

        // Pemohon baru dapat melihat suratnya setelah terbit; pejabat yang
        // memutus (RT, Kepala Desa/Sekdes) tetap dapat melihatnya selama proses.
        if ($letter->status !== LetterStatus::Approved && $letter->isApplicant($user)) {
            abort(403, 'Pratinjau surat tersedia setelah surat terbit.');
        }

        $this->abortIfExpiredForApplicant($letter, $user);

        [$pdf, $filename] = $this->buildPdf($letter, $document);

        return $pdf->stream($filename);
    }

    /**
     * Dokumen pendukung yang digenerate dari isian form (mis. surat
     * pernyataan), dengan nama pemohon dan pihak terkait.
     * Dipakai approver dan Kasi/Kaur sebagai bahan pertimbangan.
     */
    public function supportingDocument(Letter $letter, bool $download): Response
    {
        $letter = $this->letterRepository->loadForPdf($letter);
        $context = $this->letterSnapshotService->supportingContextFor($letter);

        if (! $context['supporting_template']) {
            abort(404, 'Jenis surat ini tidak memiliki dokumen pendukung.');
        }

        $pdf = Pdf::loadView(self::VIEW, [
            'letter' => $letter,
            'template' => $this->renderTemplate($letter, $context, $context['supporting_template']),
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
    private function buildPdf(Letter $letter, ?string $documentKey): array
    {
        // Surat approved dirender dari snapshot final approve.
        $context = $this->letterSnapshotService->contextFor($letter);

        if (! $letter->letterType) {
            abort(500, 'Template surat tidak ditemukan. Hubungi administrator.');
        }

        $document = $this->documentFor($letter, $context, $documentKey);
        $filename = $document['key'] === LetterDocuments::MAIN
            ? "surat-{$letter->id}.pdf"
            : "surat-{$letter->id}-{$document['key']}.pdf";

        // Formulir Disdukcapil berkotak (mis. F-2.01) butuh memori lebih.
        if (self::memoryLimitBytes() < 512 * 1024 * 1024) {
            ini_set('memory_limit', '512M');
        }

        $pdf = Pdf::loadView(self::VIEW, [
            'letter' => $letter,
            'template' => $this->renderTemplate($letter, $context, (string) $document['template']),
        ]);

        PaperSize::apply($pdf, $document['paper'], $document['orientation']);

        return [$pdf, $filename];
    }

    /**
     * Formulir isi tangan (letter_types.handwritten_forms) untuk pemohon
     * yang akan mengajukan: identitas pemohon terisi dari data penduduk,
     * isian lain (mis. daftar warga yang menyetujui) dibiarkan bertitik
     * untuk ditulis tangan. Berkas yang sudah diisi lalu difoto dan
     * diunggah sebagai berkas persyaratan.
     */
    public function handwrittenForm(LetterType $letterType, User $user, string $key, bool $download): Response
    {
        $form = collect($letterType->handwritten_forms ?? [])->firstWhere('key', $key)
            ?? abort(404, 'Formulir ini tidak tersedia untuk jenis surat ini.');

        $context = $this->letterSnapshotService->handwrittenFormContext($user);
        $applicant = $context['applicant'];
        $replacements = array_map(fn ($value) => e((string) $value), [
            ...$this->villageReplacements($context['village']),
            '{{ applicant_name }}' => $applicant['name'] ?? '',
            '{{ applicant_nik }}' => $applicant['nik'] ?? '',
            '{{ applicant_address }}' => $applicant['address'] ?? '',
            '{{ applicant_gender }}' => $applicant['gender'],
            '{{ applicant_birth_place_date }}' => $applicant['birth_place_date'],
            '{{ applicant_occupation }}' => $applicant['occupation'],
            '{{ applicant_marital_status }}' => $applicant['marital_status'],
            '{{ applicant_religion }}' => $applicant['religion'],
            '{{ applicant_email }}' => (string) ($applicant['email'] ?? ''),
        ]);
        $replacements['{{ logo_img }}'] = $this->logoHtml();

        $html = str_replace(array_keys($replacements), array_values($replacements), (string) ($form['template'] ?? ''));
        // Placeholder lain tidak punya nilai sebelum pengajuan: ditulis tangan.
        $html = (string) preg_replace('/\{\{\s*[a-zA-Z0-9_]+\s*}}/', '..............................', $html);

        $pdf = Pdf::loadView(self::VIEW, ['letter' => null, 'template' => $html]);
        PaperSize::apply($pdf, $form['paper'] ?? null);
        $filename = 'formulir-'.Str::slug($letterType->code.' '.$key).'.pdf';

        return $download ? $pdf->download($filename) : $pdf->stream($filename);
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
     * @return array{key: string, title: string, template: string|null, orientation: string, paper: string}
     */
    private function documentFor(Letter $letter, array $context, ?string $key): array
    {
        $documents = LetterDocuments::applicable(
            (string) ($context['title'] ?? $letter->letterType?->name),
            $context['template'] ?? null,
            $context['documents'] ?? $letter->letterType?->documents,
            is_array($letter->payload) ? $letter->payload : [],
            // Snapshot lama belum menyimpan ukuran kertas.
            $context['paper_size'] ?? $letter->letterType?->paper_size,
        );

        return LetterDocuments::find($documents, $key)
            ?? abort(404, 'Dokumen ini tidak terbit untuk surat ini.');
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function renderTemplate(Letter $letter, array $context, ?string $source = null): string
    {
        $replacements = $this->getReplacements($letter, $context);

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

        // Ruang tanda tangan dibiarkan kosong untuk TTD basah.
        $templateHtml = (string) preg_replace('/\{\{\s*(?:tanda_tangan_[a-z0-9_]+|signature_img|ttd_[a-z0-9_]+)\s*}}/', '', $templateHtml);

        // Replace any unmapped {{ placeholder }} tags with fallback underline line
        return preg_replace('/\{\{\s*([a-zA-Z0-9_]+)\s*}}/', '________________________', $templateHtml);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function getReplacements(Letter $letter, array $context): array
    {
        $signer = $context['signer'];
        $village = $context['village'];

        // logo_img adalah HTML buatan sistem; nilai lain
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
            // Snapshot lama belum menyimpan agama, kewarganegaraan, dan wilayah pemohon.
            '{{ applicant_religion }}' => $context['applicant']['religion'] ?? '-',
            '{{ applicant_citizenship }}' => $context['applicant']['citizenship'] ?? 'Indonesia',
            '{{ applicant_rt }}' => $context['applicant']['area']['rt'] ?? '......',
            '{{ applicant_rw }}' => $context['applicant']['area']['rw'] ?? '......',
            '{{ applicant_dusun }}' => $context['applicant']['area']['dusun'] ?? '..........................',
            '{{ pejabat_rt_pemohon_nama }}' => $context['applicant']['area']['rt_head'] ?? '..................................',
            '{{ pejabat_rw_pemohon_nama }}' => $context['applicant']['area']['rw_head'] ?? '..................................',
            '{{ applicant_family_number }}' => $context['applicant']['family_number'] ?? '________________________',
            '{{ applicant_email }}' => (string) ($context['applicant']['email'] ?? ''),
            '{{ village_kasi_pemerintahan_name }}' => $context['village']['kasi_pemerintahan_name'] ?? '________________________',
            '{{ purpose }}' => $letter->purpose ?? '________________________________________',
            '{{ submitted_at }}' => $context['submitted_at'],
            '{{ issued_at }}' => $context['issued_at'] ?? $context['submitted_at'],
            ...$this->issuedDateParts((string) ($context['issued_at'] ?? $context['submitted_at'])),
            '{{ applicant_resident_phrase }}' => $context['applicant']['resident_phrase']
                ?? 'benar-benar warga masyarakat Desa kami, dan',
            ...$this->villageReplacements($village),
            '{{ village_head_name }}' => $signer['name'] ?? '________________________________________',
        ];

        $textReplacements = [...$textReplacements, ...$this->serviceOfficialReplacements($context['service_officials'] ?? [])];

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
        $replacements['{{ logo_img }}'] = $this->logoHtml();

        return [...$payloadHtml, ...$replacements];
    }

    private function logoHtml(): string
    {
        $logoPath = public_path('images/logo-pangandaran.png');

        return file_exists($logoPath)
            ? '<img src="'.$logoPath.'" style="width: 75px; height: auto;">'
            : '';
    }

    /**
     * Kop surat dan wilayah administratif dari profil desa (belum di-escape).
     *
     * @param  array<string, mixed>  $village
     * @return array<string, string>
     */
    private function villageReplacements(array $village): array
    {
        $villageName = (string) ($village['name'] ?? '');
        $villageShort = (string) preg_replace('/^Desa\s+/i', '', $villageName);
        $district = (string) ($village['district'] ?? '');
        $regency = (string) ($village['regency'] ?? '');
        $province = (string) ($village['province'] ?? '');
        $villageRegion = implode(' ', array_filter([
            $villageShort !== '' ? "Desa {$villageShort}" : null,
            $district !== '' ? "Kecamatan {$district}" : null,
            $regency !== '' ? "Kabupaten {$regency}" : null,
            $province !== '' ? $province : null,
        ]));

        return [
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
            '{{ village_area_code }}' => (string) ($village['area_code'] ?? ''),
            '{{ village_email }}' => (string) ($village['email'] ?? ''),
        ];
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
     * Formulir pelayanan (Fxx): nama/NIK pejabat penanda tangan dari
     * snapshot final approve (service_officials); ruang TTD-nya kosong.
     *  - {{ pejabat_kepala_desa_nama }}.
     *  - {{ pejabat_rt_<area>_nama }}/{{ pejabat_rt_<area>_nik }} (juga rw):
     *    Ketua RT/RW wilayah isian village_area.
     *
     * @param  array<string, mixed>  $officials
     * @return array<string, string>
     */
    private function serviceOfficialReplacements(array $officials): array
    {
        $text = [
            '{{ pejabat_kepala_desa_nama }}' => $officials['kepala_desa']['name'] ?? '................................',
        ];

        foreach ($officials['areas'] ?? [] as $area => $areaOfficials) {
            foreach (['rt', 'rw'] as $level) {
                $text["{{ pejabat_{$level}_{$area}_nama }}"] = $areaOfficials[$level]['name'] ?? '.............................................';
                $text["{{ pejabat_{$level}_{$area}_nik }}"] = $areaOfficials[$level]['nik'] ?? '......................................';
            }
        }

        return $text;
    }
}
