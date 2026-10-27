<?php

namespace Tests\Feature;

use App\Enums\LetterTypeCategory;
use App\Models\LetterType;
use App\Models\Village;
use App\Support\LetterFormSchema;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use Database\Seeders\ServiceLetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Arr;
use Tests\TestCase;

/**
 * Definisi tipe surat (isian form) dan template-nya diset developer di
 * seeder dan harus saling cocok: setiap placeholder di template harus
 * punya sumber, yaitu data sistem atau isian form.
 */
class LetterTypeDefinitionConsistencyTest extends TestCase
{
    use RefreshDatabase;

    /** Placeholder yang diisi sistem (PdfService::getReplacements). */
    private const SYSTEM_PLACEHOLDERS = [
        'logo_img', 'signature_img', 'letter_number', 'applicant_name', 'applicant_nik',
        'applicant_address', 'applicant_gender', 'applicant_birth_place_date', 'applicant_occupation',
        'applicant_resident_phrase', 'purpose', 'submitted_at', 'issued_at', 'village_name',
        'village_name_short', 'village_name_upper', 'village_district', 'village_district_upper',
        'village_regency', 'village_regency_upper', 'village_province', 'village_region',
        'village_address', 'village_phone', 'village_postal_code', 'village_email',
        'village_head_name', 'applicant_family_number', 'village_kasi_pemerintahan_name',
        'applicant_marital_status',
        // TTD formulir pelayanan (PdfService::serviceSignatureReplacements).
        'tanda_tangan_pemohon', 'tanda_tangan_kepala_desa', 'tanda_tangan_kasi_pemerintahan',
        'pejabat_kepala_desa_nama',
    ];

    /** Baris sistem {{#each kk_anggota}}: rincian KK pemohon. */
    private const SYSTEM_LOOP_PLACEHOLDERS = ['no', 'nama', 'nik', 'shdk'];

    protected function setUp(): void
    {
        parent::setUp();

        Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class, ServiceLetterTypeSeeder::class]);
    }

    public function test_every_template_placeholder_has_a_source(): void
    {
        $unsourced = [];

        foreach (LetterType::query()->orderBy('code')->get() as $letterType) {
            // {{ isian[0] }} = kotak per karakter dari isian yang sama.
            // {{ a|b }} = cadangan: tiap nama harus punya sumber.
            preg_match_all('/\{\{\s*([a-zA-Z0-9_|]+)(?:\[\d+\])?\s*}}/', $this->templatesOf($letterType), $matches);
            $names = array_merge(...array_map(fn (string $name): array => explode('|', $name), $matches[1]));
            $missing = array_values(array_unique(array_diff($names, $this->sourcesFor($letterType))));
            sort($missing);

            if ($missing !== []) {
                $unsourced[$letterType->code] = $missing;
            }
        }

        $this->assertSame([], $unsourced);

        // "Keperluan" bukan lagi isian umum: tidak ada template yang memakainya.
        foreach (LetterType::query()->get() as $letterType) {
            $this->assertStringNotContainsString('{{ purpose }}', (string) $letterType->template, $letterType->code);
        }
    }

    public function test_every_form_field_is_used_by_the_template_or_a_data_action(): void
    {
        $unused = [];

        foreach (LetterType::query()->orderBy('code')->get() as $letterType) {
            // Isian juga terpakai bila menjadi syarat isian lain, dokumen,
            // atau blok {{#if}} di template.
            $dataSources = [
                ...array_column($letterType->data_fields ?? [], 'source'),
                $letterType->data_subject_field,
                ...array_column(array_column($letterType->form_fields ?? [], 'visible_when'), 'field'),
                ...array_column(array_column($letterType->documents ?? [], 'when'), 'field'),
                // Kepala keluarga baru / anggota yang dikeluarkan dari family_roster.
                ...array_column($letterType->form_fields ?? [], 'head'),
                ...array_column($letterType->form_fields ?? [], 'exclude'),
                // Isian yang dirujuk opsi aksi data (kepala keluarga baru, susunan KK F09).
                ...array_filter(Arr::flatten($letterType->data_options ?? []), 'is_string'),
                // Nama pemilik NIK yang dimintai persetujuan (saksi, pasangan, kepala KK tujuan).
                ...array_column(array_filter(
                    $letterType->form_fields ?? [],
                    fn (array $field): bool => isset($field['from_nik']) && isset(collect($letterType->form_fields)->firstWhere('name', $field['from_nik'])['witness']),
                ), 'name'),
            ];
            $templates = $this->templatesOf($letterType);

            foreach ((new LetterFormSchema($letterType))->valueFieldNames() as $name) {
                // Termasuk cadangan {{ a|nama }} dan kotak {{ nama[0] }}.
                $printed = preg_match('/\{\{[^{}]*?(?<![a-z0-9_])'.preg_quote($name, '/').'(?![a-z0-9])/', $templates) === 1
                    || str_contains($templates, "{{#if {$name}")
                    || str_contains($templates, "{{#each {$name}");

                if (! $printed && ! in_array($name, $dataSources, true)) {
                    $unused[$letterType->code][] = $name;
                }
            }
        }

        $this->assertSame([], $unused);
    }

    public function test_seeded_types_use_the_single_flow_and_have_a_form_definition(): void
    {
        $letterTypes = LetterType::query()->with('flow.steps')->orderBy('code')->get();

        // 11 Persuratan Desa (Axx) + Layanan Kependudukan (Fxx).
        $this->assertSame(
            ['persuratan' => 11, 'pelayanan' => 9],
            $letterTypes->countBy(fn (LetterType $type) => $type->category->value)->all(),
        );

        foreach ($letterTypes as $letterType) {
            $this->assertSame(ApprovalFlowSeeder::DEFAULT_FLOW_NAME, $letterType->flow->name);
            $this->assertSame(['rt', 'kepala_desa'], $letterType->flow->steps->pluck('approver_position')->all());
            $this->assertNotNull($letterType->form_fields, "{$letterType->code} belum punya definisi isian.");
            $this->assertTrue($letterType->produces_letter);

            if (str_starts_with($letterType->code, 'A')) {
                $this->assertSame('kaur_tu_umum', $letterType->assigned_role, "{$letterType->code} harus ditangani Kaur TU & Umum.");
                $this->assertSame(LetterTypeCategory::Persuratan, $letterType->category, "{$letterType->code} termasuk Persuratan Desa.");
                $this->assertTrue($letterType->issues_letter_number && $letterType->signed_by_village_head);
                $this->assertFalse($letterType->requires_result_upload);
            } else {
                // Formulir Disdukcapil: tanpa nomor dan TTD Kepala Desa,
                // bersambung dengan unggah hasil ke Kasi Pemerintahan.
                $this->assertSame('kasi_pemerintahan', $letterType->assigned_role, "{$letterType->code} harus ditangani Kasi Pemerintahan.");
                $this->assertSame(LetterTypeCategory::Pelayanan, $letterType->category, "{$letterType->code} termasuk Layanan Kependudukan.");
                $this->assertFalse($letterType->issues_letter_number || $letterType->signed_by_village_head);
                $this->assertTrue($letterType->requires_result_upload);
                $this->assertNotNull($letterType->result_upload_hint);
                $this->assertStringNotContainsString('{{ signature_img }}', (string) $letterType->template);
                $this->assertStringNotContainsString('{{ letter_number }}', (string) $letterType->template);
            }

            foreach ($letterType->form_fields as $field) {
                $this->assertContains($field['type'], LetterFormSchema::FIELD_TYPES);
            }
        }

        // Penguburan menonaktifkan data almarhum; Kelahiran menambah anak.
        $this->assertSame(
            ['A07' => 'update_citizen', 'A08' => 'create_citizen', 'F01' => 'create_citizen', 'F02' => 'update_members', 'F03' => 'deactivate_members', 'F04' => 'create_citizen', 'F05' => 'create_citizen', 'F06' => 'deactivate_members', 'F07' => 'update_citizens', 'F08' => 'update_citizen', 'F09' => 'restructure_family'],
            $letterTypes
                ->filter(fn (LetterType $type) => $type->data_action->value !== 'none')
                ->mapWithKeys(fn (LetterType $type) => [$type->code => $type->data_action->value])
                ->all(),
        );

        // Penghasilan memakai kode klasifikasi 510, lainnya 470.
        $this->assertSame(
            ['A03' => '510'],
            $letterTypes->where('classification_code', '!=', '470')->pluck('classification_code', 'code')->all(),
        );
    }

    /**
     * Template dokumen utama beserta dokumen yang terbit bersama.
     */
    private function templatesOf(LetterType $letterType): string
    {
        return implode(PHP_EOL, [
            (string) $letterType->template,
            ...array_map(fn (array $document): string => (string) ($document['template'] ?? ''), $letterType->documents ?? []),
        ]);
    }

    /**
     * Isian bertipe tanggal dan angka menghasilkan placeholder turunan
     * (LetterValueFormatter): <nama>_hari dan <nama>_terbilang.
     *
     * @return array<int, string>
     */
    private function sourcesFor(LetterType $letterType): array
    {
        $sources = [...self::SYSTEM_PLACEHOLDERS, ...self::SYSTEM_LOOP_PLACEHOLDERS];

        foreach ((new LetterFormSchema($letterType))->valueFields() as $field) {
            $sources[] = $field['name'];

            if ($field['type'] === 'date') {
                $sources = [...$sources, ...array_map(
                    fn (string $suffix): string => "{$field['name']}_{$suffix}",
                    ['hari', 'namahari', 'tgl', 'bln', 'thn'],
                )];
            }

            if ($field['type'] === 'family_roster') {
                $sources[] = "{$field['name']}_jumlah";

                // Susunan KK hasil F09: wilayah dan alamat KK.
                foreach (['alamat', 'dusun', 'rt', 'rw'] as $key) {
                    $sources[] = "{$field['name']}_{$key}";
                }

                foreach (range(1, LetterFormSchema::ROSTER_ROWS) as $row) {
                    foreach (LetterFormSchema::MEMBER_KEYS as $key) {
                        $sources[] = "{$field['name']}_{$row}_{$key}";
                    }
                }
            }

            if ($field['type'] === 'family_member') {
                $sources = [...$sources, ...array_map(
                    fn (string $key): string => "{$field['name']}_{$key}",
                    LetterFormSchema::MEMBER_KEYS,
                )];
            }

            if ($field['type'] === 'number') {
                $sources[] = "{$field['name']}_terbilang";
            }

            if ($field['type'] === 'village_area') {
                $sources = [...$sources, "{$field['name']}_dusun", "{$field['name']}_rw", "{$field['name']}_rt"];

                // Ketua RT/RW wilayah tersebut.
                foreach (['rt', 'rw'] as $level) {
                    $sources = [
                        ...$sources,
                        "tanda_tangan_{$level}_{$field['name']}",
                        "pejabat_{$level}_{$field['name']}_nama",
                        "pejabat_{$level}_{$field['name']}_nik",
                    ];
                }
            }

            // Placeholder di dalam {{#each}}: nomor baris dan isi baris.
            if ($field['type'] === 'repeater') {
                $sources = [...$sources, 'no', ...array_column($field['fields'] ?? [], 'name')];

                foreach ($field['fields'] ?? [] as $subField) {
                    if ($subField['type'] === 'family_member') {
                        $sources = [...$sources, ...array_map(
                            fn (string $key): string => "{$subField['name']}_{$key}",
                            LetterFormSchema::ROW_MEMBER_KEYS,
                        )];
                    }
                }
            }

            if ($field['type'] === 'family_members') {
                $sources = [...$sources, 'no', ...LetterFormSchema::FAMILY_MEMBER_KEYS];
            }
        }

        // TTD pemohon bila NIK di isian itu NIK pemohon.
        foreach ($sources as $source) {
            $sources[] = "tanda_tangan_pemohon_bila_{$source}";
        }

        return $sources;
    }
}
