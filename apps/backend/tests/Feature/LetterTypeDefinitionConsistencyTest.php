<?php

namespace Tests\Feature;

use App\Enums\LetterTypeCategory;
use App\Models\LetterType;
use App\Models\Village;
use App\Support\LetterFormSchema;
use Database\Seeders\ApprovalFlowSeeder;
use Database\Seeders\LetterTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        'village_head_name',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        Village::factory()->create();
        $this->seed([ApprovalFlowSeeder::class, LetterTypeSeeder::class]);
    }

    public function test_every_template_placeholder_has_a_source(): void
    {
        $unsourced = [];

        foreach (LetterType::query()->orderBy('code')->get() as $letterType) {
            preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*}}/', $this->templatesOf($letterType), $matches);
            $missing = array_values(array_unique(array_diff($matches[1], $this->sourcesFor($letterType))));
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
            $dataSources = [
                ...array_column($letterType->data_fields ?? [], 'source'),
                $letterType->data_subject_field,
            ];

            foreach ((new LetterFormSchema($letterType))->valueFieldNames() as $name) {
                if (! str_contains($this->templatesOf($letterType), "{{ {$name}") && ! in_array($name, $dataSources, true)) {
                    $unused[$letterType->code][] = $name;
                }
            }
        }

        $this->assertSame([], $unused);
    }

    public function test_seeded_types_use_the_single_flow_and_have_a_form_definition(): void
    {
        $letterTypes = LetterType::query()->with('flow.steps')->orderBy('code')->get();

        $this->assertCount(11, $letterTypes);

        foreach ($letterTypes as $letterType) {
            $this->assertSame(ApprovalFlowSeeder::DEFAULT_FLOW_NAME, $letterType->flow->name);
            $this->assertSame(['rt', 'kepala_desa'], $letterType->flow->steps->pluck('approver_position')->all());
            $this->assertNotNull($letterType->form_fields, "{$letterType->code} belum punya definisi isian.");
            $this->assertTrue($letterType->produces_letter);
            $this->assertSame('kaur_tu_umum', $letterType->assigned_role, "{$letterType->code} harus ditangani Kaur TU & Umum.");
            $this->assertSame(LetterTypeCategory::Persuratan, $letterType->category, "{$letterType->code} termasuk Persuratan Desa.");

            foreach ($letterType->form_fields as $field) {
                $this->assertContains($field['type'], LetterFormSchema::FIELD_TYPES);
            }
        }

        // Penguburan menonaktifkan data almarhum; Kelahiran menambah anak.
        $this->assertSame(
            ['A07' => 'update_citizen', 'A08' => 'create_citizen'],
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
        $sources = self::SYSTEM_PLACEHOLDERS;

        foreach ((new LetterFormSchema($letterType))->valueFields() as $field) {
            $sources[] = $field['name'];

            if ($field['type'] === 'date') {
                $sources[] = "{$field['name']}_hari";
            }

            if ($field['type'] === 'number') {
                $sources[] = "{$field['name']}_terbilang";
            }
        }

        return $sources;
    }
}
