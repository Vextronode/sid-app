<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\Village;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Tests\Concerns\BuildsLetterScenario;
use Tests\TestCase;

/**
 * Isian berulang: baris yang ditambah pemohon (repeater) dan anggota KK
 * pemohon yang dicentang (family_members), dicetak lewat {{#each}}.
 */
class RepeatingFormFieldsTest extends TestCase
{
    use BuildsLetterScenario, RefreshDatabase;

    private Village $village;

    private array $applicant;

    private array $rtApprover;

    private array $kades;

    private Citizen $wife;

    private Citizen $outsider;

    private LetterType $letterType;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->village = Village::factory()->create();
        ['rt' => $rt] = $this->makeArea($this->village);
        $family = Family::factory()->create(['village_id' => $this->village->id]);
        $this->applicant = $this->makeCitizenAccount($this->village, $rt, 'warga', [
            'name' => 'Kepala Rumah',
            'nik' => '3207010101800001',
            'family_id' => $family->id,
            'family_role' => 'kepala_keluarga',
            'date_of_birth' => '1980-01-01',
        ]);
        $this->wife = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'name' => 'Istri Rumah',
            'family_id' => $family->id,
            'family_role' => 'istri',
            'date_of_birth' => '1985-01-01',
        ]);
        $this->outsider = Citizen::factory()->create([
            'village_id' => $this->village->id,
            'family_id' => Family::factory()->create(['village_id' => $this->village->id])->id,
        ]);
        $this->rtApprover = $this->makeOfficialUser('rt', $this->village, ['rt_id' => $rt->id]);
        $this->kades = $this->makeOfficialUser('kepala_desa', $this->village);

        $this->letterType = LetterType::factory()->create([
            'village_id' => $this->village->id,
            'flow_id' => $this->makeDefaultFlow()->id,
            'template' => '{{#each anak}}<p>{{ no }}. {{ nama }} ({{ tanggal_lahir }}){{#if kewarganegaraan=wna}} PASPOR {{ paspor }}{{/if}}</p>{{/each}}'
                .'{{#each anggota}}[{{ no }} {{ nama }} {{ nik }} {{ shdk }}]{{/each}}',
            'form_fields' => [
                [
                    'name' => 'anak',
                    'label' => 'Anak',
                    'type' => 'repeater',
                    'required' => true,
                    'max' => 3,
                    'item_label' => 'anak',
                    'fields' => [
                        ['name' => 'nama', 'label' => 'Nama Anak', 'type' => 'text', 'required' => true],
                        ['name' => 'tanggal_lahir', 'label' => 'Tanggal Lahir', 'type' => 'date', 'required' => true],
                        [
                            'name' => 'kewarganegaraan',
                            'label' => 'Kewarganegaraan',
                            'type' => 'select',
                            'required' => true,
                            'options' => [['value' => 'wni', 'label' => 'WNI'], ['value' => 'wna', 'label' => 'WNA']],
                        ],
                        ['name' => 'paspor', 'label' => 'Nomor Paspor', 'type' => 'text', 'required' => true, 'visible_when' => ['field' => 'kewarganegaraan', 'equals' => 'wna']],
                    ],
                ],
                ['name' => 'anggota', 'label' => 'Anggota yang Pindah', 'type' => 'family_members', 'required' => true],
            ],
        ]);
    }

    public function test_rows_and_family_members_are_validated(): void
    {
        $budi = ['nama' => 'Budi', 'tanggal_lahir' => '2020-05-12', 'kewarganegaraan' => 'wni'];
        $self = $this->applicant['citizen']->id;

        $this->submit(['anggota' => [$self]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anak');
        $this->submit(['anak' => [['tanggal_lahir' => '2020-05-12', 'kewarganegaraan' => 'wni']], 'anggota' => [$self]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anak.0.nama');
        $this->submit(['anak' => [$budi, $budi, $budi, $budi], 'anggota' => [$self]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anak');
        // Sub-isian bersyarat dinilai per baris.
        $this->submit(['anak' => [$budi, [...$budi, 'kewarganegaraan' => 'wna']], 'anggota' => [$self]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anak.1.paspor');
        $this->submit(['anak' => [[...$budi, 'warna' => 'merah']], 'anggota' => [$self]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anak.0');
        // Hanya anggota KK pemohon yang dapat dipilih.
        $this->submit(['anak' => [$budi], 'anggota' => [$this->outsider->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anggota.0');
        $this->submit(['anak' => [$budi], 'anggota' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payload.anggota');
    }

    public function test_rows_are_stored_and_printed_as_numbered_entries(): void
    {
        $letterId = $this->submit([
            'anak' => [
                // Paspor tersisa pada baris WNI dibuang.
                ['nama' => 'Budi', 'tanggal_lahir' => '2020-05-12', 'kewarganegaraan' => 'wni', 'paspor' => 'SISA'],
                ['nama' => 'Ani', 'tanggal_lahir' => '2022-01-03', 'kewarganegaraan' => 'wna', 'paspor' => 'X123'],
            ],
            'anggota' => [$this->applicant['citizen']->id, $this->wife->id],
        ])->assertCreated()->json('data.id');

        $payload = Letter::query()->findOrFail($letterId)->payload;
        $this->assertArrayNotHasKey('paspor', $payload['anak'][0]);
        $this->assertSame('Istri Rumah', $payload['anggota'][1]['nama']);
        $this->assertSame('Istri', $payload['anggota'][1]['shdk']);

        $html = $this->render($letterId);
        $this->assertStringContainsString('<p>1. Budi (12 Mei 2020)</p>', $html);
        $this->assertStringContainsString('<p>2. Ani (3 Januari 2022) PASPOR X123</p>', $html);
        $this->assertStringContainsString('[1 Kepala Rumah 3207010101800001 Kepala Keluarga]', $html);
        $this->assertStringContainsString('[2 Istri Rumah', $html);
        $this->assertStringNotContainsString('SISA', $html);
    }

    public function test_applicant_can_list_their_family_members(): void
    {
        $this->actingAs($this->applicant['user'])
            ->getJson('/api/profile/family-members')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Kepala Rumah')
            ->assertJsonPath('data.0.is_self', true)
            ->assertJsonPath('data.0.family_role_label', 'Kepala Keluarga')
            ->assertJsonPath('data.0.nik_masked', '************0001')
            ->assertJsonPath('data.0.gender', $this->applicant['citizen']->gender)
            ->assertJsonPath('data.1.family_role_label', 'Istri');
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->applicant['user'])->postJson('/api/letters', [
            'letter_type_id' => $this->letterType->id,
            'payload' => $payload,
        ]);
    }

    private function render(string $letterId): string
    {
        $this->actingAs($this->rtApprover['user'])
            ->patchJson("/api/rt/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();
        $this->actingAs($this->kades['user'])
            ->patchJson("/api/kades/letters/{$letterId}/decision", ['status' => 'approved'])
            ->assertOk();

        $rendered = null;
        $pdf = Mockery::mock(DomPdf::class);
        $pdf->shouldReceive('download')->once()->andReturn(new Response('', 200));
        Pdf::shouldReceive('loadView')
            ->once()
            ->with('pdf.templates.letter', Mockery::on(function (array $data) use (&$rendered): bool {
                $rendered = $data['template'];

                return true;
            }))
            ->andReturn($pdf);

        $this->actingAs($this->applicant['user'])->get("/api/letters/{$letterId}/download")->assertOk();

        return (string) $rendered;
    }
}
