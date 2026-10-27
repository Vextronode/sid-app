<?php

namespace App\Services;

use App\Enums\FamilyRole;
use App\Enums\LetterDataAction;
use App\Enums\LetterResultStage;
use App\Enums\LetterStatus;
use App\Http\Requests\StoreCitizenRequest;
use App\Http\Requests\UpdateCitizenRequest;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\Letter;
use App\Models\Occupation;
use App\Models\Rt;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use App\Repositories\UserRepository;
use App\Support\CitizenLabels;
use App\Support\FieldCondition;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * "Terapkan": aksi data setelah surat final approved. Kasi/Kaur yang
 * ditugaskan (atau Petugas Desa sebagai cadangan) menerapkan nilai yang
 * diusulkan warga lewat form surat ke data kependudukan. Kolom yang boleh
 * disentuh ditetapkan per tipe surat (letter_types.data_fields); tidak ada
 * jalur edit bebas ke data warga dari sini.
 *
 * Aksi semi-manual: `deactivate_members` menonaktifkan anggota KK yang
 * dipilih pemohon (isian family_members), dan `manual` hanya mencatat
 * bahwa Kasi/Kaur sudah mengerjakan perubahannya sendiri di Data
 * Penduduk/KK (mis. susunan KK baru), lengkap dengan catatannya.
 *
 * Sebelum Terapkan, `preview()` menghitung daftar perubahan per warga
 * (lama -> baru) dengan menjalankan Terapkan di transaksi yang lalu
 * dibatalkan, sehingga yang dikonfirmasi Kasi/Kaur sama dengan yang
 * disimpan.
 */
class LetterFulfillmentService
{
    /** Kolom yang nilainya mengikuti pemohon bila tidak diisi saat tambah warga. */
    private const INHERITED_FROM_APPLICANT = ['rt_id', 'hamlet_id', 'family_id', 'address'];

    /** Judul kolom di daftar perubahan. */
    private const COLUMN_TITLES = [
        'nik' => 'NIK',
        'name' => 'Nama',
        'place_of_birth' => 'Tempat Lahir',
        'date_of_birth' => 'Tanggal Lahir',
        'gender' => 'Jenis Kelamin',
        'blood_type' => 'Golongan Darah',
        'address' => 'Alamat',
        'rt_id' => 'RT/RW',
        'hamlet_id' => 'Dusun',
        'family_id' => 'Kartu Keluarga',
        'family_role' => 'Hubungan dalam KK',
        'mother_name_text' => 'Nama Ibu',
        'father_name_text' => 'Nama Ayah',
        'marital_status' => 'Status Perkawinan',
        'occupation_id' => 'Pekerjaan',
        'religion' => 'Agama',
        'last_education' => 'Pendidikan Terakhir',
        'residency_type' => 'Status Kependudukan',
        'father_id' => 'Data Ayah (warga desa)',
        'mother_id' => 'Data Ibu (warga desa)',
        'is_active' => 'Status Data Warga',
        'account_is_active' => 'Akun Login',
    ];

    public function __construct(
        protected LetterRepository $letterRepository,
        protected CitizenService $citizenService,
        protected OfficialService $officialService,
        protected UserRepository $userRepository,
        protected FamilyService $familyService,
    ) {}

    /**
     * Bahan tinjauan sebelum Terapkan: tiap kolom dengan nilai sekarang
     * dan nilai yang diusulkan warga.
     *
     * @return array<string, mixed>
     */
    public function proposal(Letter $letter): array
    {
        $letter->loadMissing(['letterType', 'citizen']);
        $action = $this->actionOf($letter);
        $proposed = $this->proposedValues($letter);
        $current = $action === LetterDataAction::UpdateCitizen ? $this->subjectCitizen($letter, null) : null;
        $subjectField = $letter->letterType?->data_subject_field;
        $familyMode = match ($action) {
            LetterDataAction::CreateCitizen => $this->familyMode($letter),
            LetterDataAction::RestructureFamily => $this->restructureKind($letter) === 'new_family' ? 'create' : null,
            default => null,
        };
        $options = in_array($action, [LetterDataAction::UpdateCitizen, LetterDataAction::CreateCitizen], true)
            ? $this->columnOptions($letter)
            : [];
        $fields = array_map(fn (array $field): array => [
            'column' => $field['column'],
            'label' => $field['label'] ?? $field['column'],
            'source' => $field['source'] ?? null,
            'current' => $current ? $this->scalar($current->getAttribute($field['column'])) : null,
            'proposed' => $proposed[$field['column']] ?? null,
            'proposed_label' => $this->describeValue($field['column'], $proposed[$field['column']] ?? null),
            // Pilihan koreksi berlabel (kolom berkode, mis. jenis kelamin, RT).
            'options' => $options[$field['column']] ?? null,
            // Nilai tetap dari jenis surat atau dari data penduduk; tidak dapat dikoreksi.
            'fixed' => array_key_exists('value', $field) || isset($field['citizen_by_nik']),
            'display' => $field['value_label']
                ?? (isset($field['citizen_by_nik']) ? $this->describeValue($field['column'], $proposed[$field['column']] ?? null) : null),
        ], $this->fields($letter));

        // KK baru (mis. pendatang dengan rumah sendiri): No. KK diisi dari
        // KK terbitan Disdukcapil.
        if ($familyMode === 'create') {
            $fields[] = [
                'column' => 'no_kk',
                'label' => 'No. KK Baru (dari KK terbitan Disdukcapil)',
                'source' => null,
                'current' => null,
                'proposed' => null,
                'proposed_label' => '-',
                'options' => null,
                'fixed' => false,
                'display' => null,
            ];
        }

        return [
            'action' => $action->value,
            'fulfilled_at' => $letter->fulfilled_at,
            'fulfilled_by' => $letter->fulfilled_by,
            'result' => $letter->fulfillment,
            'instructions' => $letter->letterType?->data_instructions,
            'members' => $action === LetterDataAction::DeactivateMembers ? $this->memberProposal($letter) : [],
            'new_head' => $action === LetterDataAction::DeactivateMembers ? $this->newHeadProposal($letter) : null,
            'member_changes' => $action === LetterDataAction::UpdateMembers ? $this->memberChangeProposal($letter) : [],
            'options' => $action === LetterDataAction::UpdateMembers ? $this->columnOptions($letter) : (object) [],
            // Diisi bila subjek perubahan bukan pemohon (mis. almarhum):
            // warga dicari lewat NIK yang ditulis pemohon di form.
            'subject' => $subjectField === null || $action !== LetterDataAction::UpdateCitizen ? null : [
                'nik' => $letter->payload[$subjectField] ?? null,
                'found' => $current !== null,
                'name' => $current?->name,
            ],
            'family' => $familyMode === null || $action !== LetterDataAction::CreateCitizen ? null : $this->familyProposal($letter, $familyMode),
            'restructure' => $action === LetterDataAction::RestructureFamily ? $this->restructureProposal($letter) : null,
            'subjects' => $action === LetterDataAction::UpdateCitizens ? $this->subjectProposal($letter) : [],
            'fields' => $fields,
        ];
    }

    /**
     * @param  array<string, mixed>  $values  koreksi dari Kasi/Kaur, per kolom
     * @param  string|null  $subjectNik  koreksi NIK subjek, bila subjeknya bukan pemohon
     * @param  string|null  $notes  catatan "Tandai selesai" untuk aksi manual
     */
    public function apply(Letter $letter, User $actor, array $values, ?string $subjectNik = null, ?string $notes = null): Letter
    {
        return $this->run($letter, $actor, $values, $subjectNik, $notes, dryRun: false)[0];
    }

    /**
     * Daftar perubahan yang akan disimpan Terapkan dengan nilai yang sama,
     * tanpa menyimpannya.
     *
     * @param  array<string, mixed>  $values
     * @return array<int, array<string, mixed>>
     */
    public function preview(Letter $letter, User $actor, array $values, ?string $subjectNik = null, ?string $notes = null): array
    {
        return $this->run($letter, $actor, $values, $subjectNik, $notes, dryRun: true)[1];
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array{0: Letter, 1: array<int, array<string, mixed>>}
     */
    private function run(Letter $letter, User $actor, array $values, ?string $subjectNik, ?string $notes, bool $dryRun): array
    {
        DB::beginTransaction();

        try {
            // Lock agar dua Terapkan bersamaan tidak sama-sama lolos.
            $locked = $this->letterRepository->findForUpdateOrFail($letter->id);
            $locked->load(['letterType', 'citizen']);

            if ($locked->status !== LetterStatus::Approved) {
                abort(409, 'Perubahan data hanya dapat diterapkan pada surat yang sudah disetujui.');
            }

            if ($locked->fulfilled_at !== null) {
                abort(409, 'Perubahan data untuk surat ini sudah diterapkan.');
            }

            // Formulir pelayanan: data baru diubah setelah hasil dari
            // instansi (mis. KK baru) diunggah dan diterima.
            if (! in_array($locked->resultStage(), [null, LetterResultStage::Accepted], true)) {
                abort(409, 'Perubahan data baru dapat diterapkan setelah hasil dari instansi diverifikasi.');
            }

            $action = $this->actionOf($locked);
            // No. KK baru bukan kolom data warga (lihat targetFamily()).
            $newFamilyNumber = $values['no_kk'] ?? null;
            unset($values['no_kk']);

            // Daftar [warga, perubahan] untuk jejak audit per warga.
            [$result, $touched] = match ($action) {
                LetterDataAction::UpdateCitizen, LetterDataAction::CreateCitizen => $this->singleCitizen(
                    $action,
                    $action === LetterDataAction::UpdateCitizen
                        ? $this->updateCitizen($locked, $actor, $this->finalValues($locked, $values), $subjectNik)
                        : $this->createCitizen($locked, $actor, $this->finalValues($locked, $values), $newFamilyNumber),
                ),
                LetterDataAction::DeactivateMembers => $this->deactivateMembers($locked, $actor, $notes),
                LetterDataAction::UpdateMembers => $this->updateMembers($locked, $actor, $values),
                LetterDataAction::UpdateCitizens => $this->updateCitizens($locked, $actor),
                LetterDataAction::RestructureFamily => $this->restructureFamily($locked, $actor, $newFamilyNumber),
                LetterDataAction::Manual => [['action' => $action->value, 'notes' => $notes], []],
                default => abort(422, 'Jenis surat ini tidak memiliki aksi perubahan data.'),
            };

            $changes = $this->describe($touched);

            if ($dryRun) {
                DB::rollBack();

                return [$locked, $changes];
            }

            $this->letterRepository->update($locked, [
                'fulfilled_at' => now(),
                'fulfilled_by' => $actor->id,
                'fulfillment' => $result,
            ]);

            $this->letterRepository->createStatusLogForLetter($locked, [
                'actor_id' => $actor->id,
                'old_status' => LetterStatus::Approved->value,
                'new_status' => LetterStatus::Approved->value,
                'reason' => $touched === []
                    ? 'Perubahan data kependudukan ditandai selesai (dikerjakan manual)'
                    : 'Perubahan data kependudukan diterapkan',
            ]);

            // Perubahan manual tercatat sendiri saat Kasi/Kaur mengedit data warga.
            foreach ($touched as [$citizen, $changes]) {
                activity('citizen')
                    ->performedOn($citizen)
                    ->causedBy($actor)
                    ->event('letter_fulfilled')
                    ->withProperties([
                        // Scoping halaman Log Aktivitas (S-05).
                        'village_id' => $citizen->village_id,
                        'subject_label' => $citizen->name,
                        'letter_id' => $locked->id,
                        'letter_number' => $locked->letter_number,
                        'actor_role' => $actor->role,
                        'action' => $action->value,
                        'citizen_id' => $citizen->id,
                        'changes' => $changes,
                    ])
                    ->log('Data kependudukan diubah berdasarkan surat');
            }

            $this->officialService->resolveCitizenUser($locked)?->notify(new LetterStatusNotification(
                $locked,
                'Data Kependudukan Diperbarui',
                'Perubahan data yang Anda ajukan lewat surat telah diterapkan.',
                'letter_fulfilled',
            ));

            DB::commit();

            return [$locked, $changes];
        } catch (\Throwable $exception) {
            DB::rollBack();

            throw $exception;
        }
    }

    /**
     * Perubahan per warga untuk pop up konfirmasi, dengan nilai yang mudah
     * dibaca (label pilihan, nama pekerjaan, No. KK tersamar).
     *
     * @param  array<int, array{0: Citizen, 1: array<string, mixed>}>  $touched
     * @return array<int, array<string, mixed>>
     */
    private function describe(array $touched): array
    {
        return array_map(function (array $entry): array {
            [$citizen, $changes] = $entry;

            return [
                'citizen_id' => $citizen->id,
                'name' => $citizen->name,
                'kind' => match (true) {
                    array_key_exists('nik', $changes) && ($changes['nik']['old'] ?? null) === null => 'create',
                    ($changes['is_active']['new'] ?? null) === false => 'deactivate',
                    default => 'update',
                },
                'changes' => array_values(array_map(fn (string $column, array $change): array => [
                    'column' => $column,
                    'label' => self::COLUMN_TITLES[$column] ?? ucfirst(str_replace('_', ' ', $column)),
                    'old' => $this->describeValue($column, $change['old'] ?? null),
                    'new' => $this->describeValue($column, $change['new'] ?? null),
                ], array_keys($changes), $changes)),
            ];
        }, $touched);
    }

    private function describeValue(string $column, mixed $value): string
    {
        $value = $this->scalar($value);

        if ($value === null || $value === '') {
            return '-';
        }

        return match ($column) {
            'is_active', 'account_is_active' => $value ? 'Aktif' : 'Nonaktif',
            'gender' => match ((string) $value) {
                'L' => 'Laki-laki',
                'P' => 'Perempuan',
                default => (string) $value,
            },
            'family_role' => FamilyRole::tryFrom((string) $value)?->label() ?? (string) $value,
            'blood_type' => $value === 'tidak_tahu' ? 'Tidak Tahu' : (string) $value,
            'residency_type' => ucfirst((string) $value),
            'date_of_birth' => $this->dateLabel($value),
            'occupation_id' => Occupation::query()->whereKey($value)->value('name') ?? (string) $value,
            'rt_id' => $this->areaLabel($value),
            'hamlet_id' => (string) (Hamlet::query()->whereKey($value)->value('name') ?? $value),
            'family_id' => $this->familyLabel(Family::query()->find($value)),
            'father_id', 'mother_id' => Citizen::query()->whereKey($value)->value('name') ?? (string) $value,
            default => $this->displayValue($column, $value),
        };
    }

    private function dateLabel(mixed $value): string
    {
        try {
            return CarbonImmutable::parse((string) $value)->locale('id')->translatedFormat('j F Y');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function areaLabel(mixed $rtId): string
    {
        $rt = Rt::query()->with('rw.hamlet')->find($rtId);

        return $rt === null ? (string) $rtId : sprintf(
            'Dusun %s, RT %s / RW %s',
            $rt->rw?->hamlet?->name ?? '-',
            str_pad((string) $rt->number, 3, '0', STR_PAD_LEFT),
            str_pad((string) $rt->rw?->number, 3, '0', STR_PAD_LEFT),
        );
    }

    private function familyLabel(?Family $family): string
    {
        return $family === null ? '-' : 'No. KK '.str_repeat('*', 12).substr((string) $family->no_kk, -4);
    }

    /**
     * @param  array{0: Citizen, 1: array<string, array{old: mixed, new: mixed}>}  $outcome
     * @return array{0: array<string, mixed>, 1: array<int, array{0: Citizen, 1: array<string, mixed>}>}
     */
    private function singleCitizen(LetterDataAction $action, array $outcome): array
    {
        [$citizen, $changes] = $outcome;

        return [['action' => $action->value, 'citizen_id' => $citizen->id, 'changes' => $changes], [$outcome]];
    }

    /**
     * Anggota yang dipilih pemohon beserta keadaannya sekarang.
     *
     * @return array<int, array<string, mixed>>
     */
    private function memberProposal(Letter $letter): array
    {
        $citizens = $this->selectedMembers($letter)->keyBy('id');

        return array_map(fn (array $row): array => [
            'citizen_id' => $row['citizen_id'] ?? null,
            'name' => $row['nama'] ?? '-',
            'family_role' => $row['shdk'] ?? '-',
            'found' => isset($citizens[$row['citizen_id'] ?? '']),
            'is_active' => (bool) ($citizens[$row['citizen_id'] ?? '']?->is_active ?? false),
        ], $this->memberRows($letter));
    }

    /**
     * Nonaktifkan anggota KK yang dipilih pemohon, beserta akun login
     * mereka. Anggota yang sudah nonaktif atau tidak ditemukan dilewati.
     * Tanpa anggota terpilih (mis. orang asing yang tidak terdata di F03),
     * Terapkan hanya menandai selesai.
     *
     * @return array{0: array<string, mixed>, 1: array<int, array{0: Citizen, 1: array<string, mixed>}>}
     */
    private function deactivateMembers(Letter $letter, User $actor, ?string $notes): array
    {
        if ($this->memberRows($letter) === []) {
            return [['action' => LetterDataAction::DeactivateMembers->value, 'members' => [], 'notes' => $notes], []];
        }

        $members = [];
        $touched = [];

        foreach ($this->selectedMembers($letter) as $citizen) {
            if (! $citizen->is_active) {
                continue;
            }

            $changes = ['is_active' => ['old' => true, 'new' => false]];
            $account = $this->userRepository->findByCitizenId($citizen->id);

            if ($account !== null && $account->is_active) {
                $this->userRepository->update($account, ['is_active' => false]);
                $account->tokens()->delete();
                $changes['account_is_active'] = ['old' => true, 'new' => false];
            }

            // Dicatat sebagai `letter_fulfilled` di apply(); jangan dobel.
            $citizen = $this->citizenService->update($citizen, ['is_active' => false], $actor, audit: false);
            $members[] = ['citizen_id' => $citizen->id, 'name' => $citizen->name, 'changes' => $changes];
            $touched[] = [$citizen, $changes];
        }

        if ($members === []) {
            abort(422, 'Tidak ada anggota aktif yang dapat dinonaktifkan dari surat ini.');
        }

        // Kepala keluarga yang dinonaktifkan digantikan anggota pilihan pemohon.
        $head = $this->newHead($letter);

        if ($head !== null && $head->is_active && $head->family_role?->value !== FamilyRole::KEPALA_KELUARGA->value) {
            $changes = ['family_role' => ['old' => $head->family_role?->value, 'new' => FamilyRole::KEPALA_KELUARGA->value]];
            $head = $this->citizenService->update($head, ['family_role' => FamilyRole::KEPALA_KELUARGA->value], $actor, audit: false);
            $members[] = ['citizen_id' => $head->id, 'name' => $head->name, 'changes' => $changes];
            $touched[] = [$head, $changes];
        }

        return [['action' => LetterDataAction::DeactivateMembers->value, 'members' => $members], $touched];
    }

    /**
     * Anggota KK yang menjadi kepala keluarga baru (data_options.new_head =
     * isian family_member), bila ada di payload dan masih satu KK dengan
     * pemohon.
     */
    private function newHead(Letter $letter): ?Citizen
    {
        $id = null;

        foreach ((array) ($letter->letterType?->data_options['new_head'] ?? []) as $field) {
            $id ??= $letter->payload[$field] ?? null;
        }

        if (! is_string($id) || $id === '' || $letter->citizen?->family_id === null) {
            return null;
        }

        return Citizen::query()
            ->where('village_id', $letter->village_id)
            ->where('family_id', $letter->citizen->family_id)
            ->find($id);
    }

    /**
     * @return array{name: string, family_role: string}|null
     */
    private function newHeadProposal(Letter $letter): ?array
    {
        $head = $this->newHead($letter);

        return $head === null ? null : [
            'name' => $head->name,
            'family_role' => $this->describeValue('family_role', $head->family_role),
        ];
    }

    /**
     * Usulan per anggota (satu baris repeater): kolom yang diminta berubah
     * beserta nilai sekarang dan nilai usulan. Pekerjaan "Lainnya" tidak
     * punya id katalog, jadi ditandai `needs_choice` agar Kasi/Kaur memilih
     * pekerjaan dari katalog saat Terapkan.
     *
     * @return array<int, array<string, mixed>>
     */
    private function memberChangeProposal(Letter $letter): array
    {
        $memberField = $this->rowMemberField($letter);
        $rows = $this->memberRows($letter);
        $citizens = Citizen::query()
            ->with('occupation')
            ->where('village_id', $letter->village_id)
            ->whereIn('id', array_filter(array_column($rows, $memberField)))
            ->get()
            ->keyBy('id');

        $proposal = [];

        foreach ($rows as $index => $row) {
            $citizen = $citizens[$row[$memberField] ?? ''] ?? null;
            $fields = [];

            foreach ($this->rowChanges($letter, $row) as $column => $change) {
                $fields[] = [
                    'column' => $column,
                    'label' => $change['label'],
                    'current' => $citizen ? $this->scalar($citizen->getAttribute($column)) : null,
                    'current_label' => $citizen ? $this->columnLabel($column, $citizen) : '-',
                    'proposed' => $change['value'],
                    'proposed_label' => $change['display'],
                    'needs_choice' => $change['value'] === null,
                ];
            }

            $proposal[] = [
                'index' => $index,
                'citizen_id' => $row[$memberField] ?? null,
                'name' => $row["{$memberField}_nama"] ?? $citizen?->name ?? '-',
                'found' => $citizen !== null,
                'fields' => $fields,
            ];
        }

        return $proposal;
    }

    /**
     * Terapkan perubahan per anggota. $values[<indeks baris>][<kolom>] adalah
     * koreksi Kasi/Kaur (mis. pekerjaan dari katalog untuk usulan "Lainnya").
     *
     * @param  array<int|string, mixed>  $values
     * @return array{0: array<string, mixed>, 1: array<int, array{0: Citizen, 1: array<string, mixed>}>}
     */
    private function updateMembers(Letter $letter, User $actor, array $values): array
    {
        $memberField = $this->rowMemberField($letter);
        $members = [];
        $touched = [];

        foreach ($this->memberRows($letter) as $index => $row) {
            $citizen = Citizen::query()
                ->where('village_id', $letter->village_id)
                ->find($row[$memberField] ?? null);

            if ($citizen === null) {
                throw ValidationException::withMessages([
                    "values.{$index}" => ['Anggota keluarga pada baris '.($index + 1).' tidak ditemukan di data warga.'],
                ]);
            }

            $overrides = is_array($values[$index] ?? null) ? $values[$index] : [];
            $final = [];

            foreach ($this->rowChanges($letter, $row) as $column => $change) {
                $value = ($overrides[$column] ?? '') !== '' ? $overrides[$column] : $change['value'];

                if ($value !== null && $value !== '') {
                    $final[$column] = $value;
                }
            }

            if ($final === []) {
                continue;
            }

            $validated = $this->validate($final, Arr::only($this->updateRules(), array_keys($final)));
            $changes = [];

            foreach ($validated as $column => $value) {
                $old = $this->scalar($citizen->getAttribute($column));

                if ($old != $value) {
                    $changes[$column] = ['old' => $old, 'new' => $value];
                }
            }

            // Dicatat sebagai `letter_fulfilled` di apply(); jangan dobel.
            $citizen = $this->citizenService->update($citizen, $validated, $actor, audit: false);
            $members[] = ['citizen_id' => $citizen->id, 'name' => $citizen->name, 'changes' => $changes];
            $touched[] = [$citizen, $changes];
        }

        if ($members === []) {
            abort(422, 'Tidak ada perubahan data yang dapat diterapkan dari surat ini.');
        }

        return [['action' => LetterDataAction::UpdateMembers->value, 'members' => $members], $touched];
    }

    /**
     * Kolom yang diminta berubah pada satu baris: dari data_fields yang
     * sumbernya terisi. Sumber berakhiran `_id` (pekerjaan) dianggap
     * diminta bila isian aslinya (tanpa `_id`) terisi, walau id-nya kosong.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, array{label: string, value: mixed, display: string}>
     */
    private function rowChanges(Letter $letter, array $row): array
    {
        $changes = [];

        foreach ($this->fields($letter) as $field) {
            $source = (string) ($field['source'] ?? '');
            $base = str_ends_with($source, '_id') ? substr($source, 0, -3) : $source;
            $requested = ($row[$base] ?? '') !== '' && ($row[$base] ?? null) !== null;

            if (! $requested) {
                continue;
            }

            $value = $row[$source] ?? null;
            $changes[$field['column']] = [
                'label' => $field['label'] ?? $field['column'],
                'value' => $value === '' ? null : $value,
                'display' => $this->displayValue($field['column'], $row[$base]),
            ];
        }

        return $changes;
    }

    /**
     * Pilihan nilai per kolom untuk koreksi saat Terapkan.
     *
     * @return array<string, array<int, array{value: string|int, label: string}>>
     */
    private function columnOptions(Letter $letter): array
    {
        $toOptions = fn (array $labels): array => array_map(
            fn (string $value, string $label): array => ['value' => $value, 'label' => $label],
            array_keys($labels),
            $labels,
        );

        return [
            'gender' => $toOptions(['L' => 'Laki-laki', 'P' => 'Perempuan']),
            'blood_type' => $toOptions(['A' => 'A', 'B' => 'B', 'AB' => 'AB', 'O' => 'O', 'tidak_tahu' => 'Tidak Tahu']),
            'family_role' => array_map(
                fn (FamilyRole $role): array => ['value' => $role->value, 'label' => $role->label()],
                FamilyRole::cases(),
            ),
            'residency_type' => $toOptions(['lokal' => 'Lokal', 'pendatang' => 'Pendatang']),
            'rt_id' => Rt::query()
                ->where('village_id', $letter->village_id)
                ->where('is_active', true)
                ->with('rw.hamlet')
                ->get()
                ->sortBy(fn (Rt $rt): string => sprintf('%s-%05d-%05d', $rt->rw?->hamlet?->name, (int) $rt->rw?->number, (int) $rt->number))
                ->map(fn (Rt $rt): array => ['value' => $rt->id, 'label' => $this->areaLabel($rt->id)])
                ->values()
                ->all(),
            'last_education' => $toOptions(CitizenLabels::LAST_EDUCATION),
            'religion' => $toOptions(CitizenLabels::RELIGION),
            'marital_status' => $toOptions(CitizenLabels::MARITAL_STATUS),
            'occupation_id' => Occupation::query()
                ->where('village_id', $letter->village_id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Occupation $occupation): array => ['value' => $occupation->id, 'label' => $occupation->name])
                ->all(),
        ];
    }

    private function columnLabel(string $column, Citizen $citizen): string
    {
        return match ($column) {
            'occupation_id' => $citizen->occupation?->name ?? '-',
            default => $this->displayValue($column, $citizen->getAttribute($column)),
        };
    }

    private function displayValue(string $column, mixed $value): string
    {
        return match ($column) {
            'last_education' => CitizenLabels::of(CitizenLabels::LAST_EDUCATION, $value),
            'religion' => CitizenLabels::of(CitizenLabels::RELIGION, $value),
            'marital_status' => CitizenLabels::of(CitizenLabels::MARITAL_STATUS, $value),
            default => is_scalar($value) && $value !== '' ? (string) $value : '-',
        };
    }

    /**
     * Sub-isian family_member pada repeater data_subject_field.
     */
    private function rowMemberField(Letter $letter): string
    {
        $subject = $letter->letterType?->data_subject_field;
        $repeater = collect($letter->letterType?->form_fields ?? [])->firstWhere('name', $subject);

        return (string) (collect($repeater['fields'] ?? [])->firstWhere('type', 'family_member')['name'] ?? 'anggota');
    }

    /**
     * Baris isian family_members (data_subject_field) di payload.
     *
     * @return array<int, array<string, mixed>>
     */
    private function memberRows(Letter $letter): array
    {
        $field = $letter->letterType?->data_subject_field;
        $rows = $field !== null ? ($letter->payload[$field] ?? []) : [];

        // Isian family_member tunggal (mis. almarhum): satu baris dari nilai turunannya.
        if (is_string($rows) && $rows !== '') {
            $rows = [[
                'citizen_id' => $rows,
                'nama' => $letter->payload["{$field}_nama"] ?? '-',
                'shdk' => $letter->payload["{$field}_shdk"] ?? '-',
            ]];
        }

        return array_values(array_filter(is_array($rows) ? $rows : [], 'is_array'));
    }

    /**
     * @return Collection<int, Citizen>
     */
    private function selectedMembers(Letter $letter): Collection
    {
        return Citizen::query()
            ->where('village_id', $letter->village_id)
            ->whereIn('id', array_filter(array_column($this->memberRows($letter), 'citizen_id')))
            ->get();
    }

    /**
     * @param  array<string, mixed>  $final
     * @return array{0: Citizen, 1: array<string, array{old: mixed, new: mixed}>}
     */
    private function updateCitizen(Letter $letter, User $actor, array $final, ?string $subjectNik): array
    {
        $citizen = $this->subjectCitizen($letter, $subjectNik);

        if ($citizen === null && $letter->letterType?->data_subject_field !== null) {
            throw ValidationException::withMessages([
                'subject_nik' => ['Warga dengan NIK tersebut tidak ditemukan di data desa. Periksa atau isi NIK yang benar.'],
            ]);
        }

        if ($citizen === null) {
            abort(422, 'Surat ini tidak terhubung ke data warga.');
        }

        if ($final === []) {
            abort(422, 'Tidak ada nilai perubahan untuk diterapkan.');
        }

        $rules = Arr::only($this->updateRules(), array_keys($final));
        $validated = $this->validate($final, $rules);

        $changes = [];
        foreach ($validated as $column => $value) {
            $old = $this->scalar($citizen->getAttribute($column));

            if ($old != $value) {
                $changes[$column] = ['old' => $old, 'new' => $value];
            }
        }

        // Menonaktifkan warga (mis. meninggal dunia) juga menonaktifkan
        // akun login-nya: akun lebih dulu, lalu data warganya. Keduanya
        // berada dalam transaksi apply(), jadi berhasil atau batal bersama.
        if (($validated['is_active'] ?? null) === false || ($validated['is_active'] ?? null) === 0) {
            $account = $this->userRepository->findByCitizenId($citizen->id);

            if ($account !== null && $account->is_active) {
                $this->userRepository->update($account, ['is_active' => false]);
                $account->tokens()->delete();
                $changes['account_is_active'] = ['old' => true, 'new' => false];
            }
        }

        // Dicatat sebagai `letter_fulfilled` di apply(); jangan dobel.
        $citizen = $this->citizenService->update($citizen, $validated, $actor, audit: false);

        return [$citizen, $changes];
    }

    /**
     * @param  array<string, mixed>  $final
     * @return array{0: Citizen, 1: array<string, array{old: mixed, new: mixed}>}
     */
    private function createCitizen(Letter $letter, User $actor, array $final, ?string $newFamilyNumber = null): array
    {
        $applicant = $letter->citizen;
        $rt = isset($final['rt_id'])
            ? Rt::query()->with('rw.hamlet')->where('village_id', $letter->village_id)->find($final['rt_id'])
            : null;

        // Alamat dari isian wilayah (mis. alamat pendatang), bukan pemohon.
        if ($rt !== null) {
            $final['hamlet_id'] ??= $rt->rw?->hamlet_id;
            $final['address'] ??= $this->areaLabel($rt->id);
        }

        [$family, $role] = $this->targetFamily($letter, $actor, $final, $rt, $newFamilyNumber);

        if ($family !== null) {
            $final['family_id'] = $family->id;
        }

        if ($role !== null) {
            $final['family_role'] = $role;
        }

        foreach (self::INHERITED_FROM_APPLICANT as $column) {
            if (! array_key_exists($column, $final) && $applicant?->getAttribute($column) !== null) {
                $final[$column] = $applicant->getAttribute($column);
            }
        }

        $allowed = array_merge(array_column($this->fields($letter), 'column'), self::INHERITED_FROM_APPLICANT, ['family_role']);
        $rules = Arr::only($this->createRules(), [...$allowed, 'nik', 'name', 'date_of_birth', 'gender', 'address', 'rt_id']);
        $validated = $this->validate($final, $rules);

        $citizen = $this->citizenService->create($validated, $actor, auditSource: null);

        $changes = [];
        foreach ($validated as $column => $value) {
            // NIK tidak dicatat utuh di riwayat.
            $changes[$column] = [
                'old' => null,
                'new' => $column === 'nik' ? str_repeat('*', 12).substr((string) $value, -4) : $value,
            ];
        }

        return [$citizen, $changes];
    }

    /**
     * Cara warga baru masuk KK (data_options.family): `join` = KK yang sudah
     * ada di desa (No. KK dari isian), `create` = KK baru (No. KK diisi
     * Kasi/Kaur, warga menjadi kepala keluarga), null = KK pemohon.
     */
    private function familyMode(Letter $letter): ?string
    {
        $options = $letter->letterType?->data_options['family'] ?? [];
        $payload = is_array($letter->payload) ? $letter->payload : [];

        foreach (['join', 'create'] as $mode) {
            if (isset($options[$mode]) && FieldCondition::matches($options[$mode]['when'] ?? null, $payload)) {
                return $mode;
            }
        }

        return null;
    }

    /**
     * @return array{mode: string, description: string}
     */
    private function familyProposal(Letter $letter, string $mode): array
    {
        if ($mode === 'create') {
            return ['mode' => $mode, 'description' => 'Dibuatkan KK baru dengan warga ini sebagai kepala keluarga.'];
        }

        $family = $this->joinedFamily($letter);
        $head = $family?->members()->where('family_role', FamilyRole::KEPALA_KELUARGA->value)->value('name');

        return ['mode' => $mode, 'description' => $family === null
            ? 'KK yang ditumpangi tidak ditemukan di data desa.'
            : 'Masuk ke '.$this->familyLabel($family).($head ? " (kepala keluarga: {$head})." : '.')];
    }

    private function joinedFamily(Letter $letter): ?Family
    {
        $field = $letter->letterType?->data_options['family']['join']['no_kk_field'] ?? null;
        $number = $field !== null ? (string) ($letter->payload[$field] ?? '') : '';

        return $number === '' ? null : Family::query()
            ->where('village_id', $letter->village_id)
            ->where('no_kk_hash', hash('sha256', $number))
            ->first();
    }

    /**
     * KK warga baru dan hubungannya yang dipaksakan (kepala keluarga untuk
     * KK baru). [null, null] = mengikuti KK pemohon.
     *
     * @param  array<string, mixed>  $final
     * @return array{0: ?Family, 1: ?string}
     */
    private function targetFamily(Letter $letter, User $actor, array $final, ?Rt $rt, ?string $newFamilyNumber): array
    {
        return match ($this->familyMode($letter)) {
            'join' => [$this->joinedFamily($letter) ?? throw ValidationException::withMessages([
                'values.no_kk' => ['KK yang ditumpangi tidak ditemukan di data desa. Periksa No. KK di surat, atau daftarkan KK-nya lebih dulu.'],
            ]), null],
            'create' => [$this->createFamily($actor, $final, $rt, $newFamilyNumber), FamilyRole::KEPALA_KELUARGA->value],
            default => [null, null],
        };
    }

    /**
     * @param  array<string, mixed>  $final
     */
    private function createFamily(User $actor, array $final, ?Rt $rt, ?string $number): Family
    {
        if (! is_string($number) || ! preg_match('/^\d{16}$/', $number)) {
            throw ValidationException::withMessages([
                'values.no_kk' => ['Isi No. KK baru (16 digit) sesuai KK terbitan Disdukcapil.'],
            ]);
        }

        return $this->familyService->create([
            'no_kk' => $number,
            'family_address' => (string) ($final['address'] ?? '-'),
            'rt_id' => $rt?->id,
            'rw_id' => $rt?->rw_id,
            'hamlet_id' => $rt?->rw?->hamlet_id,
        ], $actor);
    }

    /**
     * Warga desa (aktif) ber-NIK sesuai isian data_options.subjects.
     *
     * @return array<int, array{field: string, label: string, nik: string, citizen: ?Citizen}>
     */
    private function subjects(Letter $letter): array
    {
        $subjects = [];

        foreach ($letter->letterType?->data_options['subjects'] ?? [] as $field => $label) {
            $nik = (string) ($letter->payload[$field] ?? '');
            $citizen = preg_match('/^\d{16}$/', $nik) ? Citizen::query()
                ->with('occupation')
                ->where('village_id', $letter->village_id)
                ->where('nik_hash', hash('sha256', $nik))
                ->where('is_active', true)
                ->first() : null;

            $subjects[] = ['field' => $field, 'label' => (string) $label, 'nik' => $nik, 'citizen' => $citizen];
        }

        return $subjects;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function subjectProposal(Letter $letter): array
    {
        $proposed = $this->proposedValues($letter);

        return array_map(fn (array $subject): array => [
            'label' => $subject['label'],
            'name' => $subject['citizen']?->name,
            'nik_masked' => $subject['nik'] === '' ? null : str_repeat('*', 12).substr($subject['nik'], -4),
            'found' => $subject['citizen'] !== null,
            'fields' => array_map(fn (array $field): array => [
                'label' => $field['label'] ?? $field['column'],
                'current_label' => $subject['citizen'] ? $this->columnLabel($field['column'], $subject['citizen']) : '-',
                'proposed_label' => $this->describeValue($field['column'], $proposed[$field['column']] ?? null),
            ], $this->fields($letter)),
        ], $this->subjects($letter));
    }

    /**
     * Ubah kolom data_fields tiap warga subjek yang terdata di desa; yang
     * tidak terdata (mis. pasangan dari luar desa) dilewati.
     *
     * @return array{0: array<string, mixed>, 1: array<int, array{0: Citizen, 1: array<string, mixed>}>}
     */
    private function updateCitizens(Letter $letter, User $actor): array
    {
        $final = array_filter($this->proposedValues($letter), fn (mixed $value): bool => $value !== null && $value !== '');

        if ($final === []) {
            abort(422, 'Tidak ada nilai perubahan untuk diterapkan.');
        }

        $validated = $this->validate($final, Arr::only($this->updateRules(), array_keys($final)));
        $members = [];
        $touched = [];

        foreach ($this->subjects($letter) as $subject) {
            $citizen = $subject['citizen'];

            if ($citizen === null) {
                continue;
            }

            $changes = [];

            foreach ($validated as $column => $value) {
                $old = $this->scalar($citizen->getAttribute($column));

                if ($old != $value) {
                    $changes[$column] = ['old' => $old, 'new' => $value];
                }
            }

            // Dicatat sebagai `letter_fulfilled` di apply(); jangan dobel.
            $citizen = $this->citizenService->update($citizen, $validated, $actor, audit: false);
            $members[] = ['citizen_id' => $citizen->id, 'name' => $citizen->name, 'changes' => $changes];
            $touched[] = [$citizen, $changes];
        }

        if ($members === []) {
            abort(422, 'Tidak ada warga desa yang datanya dapat diubah dari surat ini.');
        }

        return [['action' => LetterDataAction::UpdateCitizens->value, 'members' => $members], $touched];
    }

    /**
     * Jenis perubahan F09 (data_options.restructure): new_family,
     * change_head, join, atau null.
     */
    private function restructureKind(Letter $letter): ?string
    {
        $config = $letter->letterType?->data_options['restructure'] ?? [];
        $kind = (string) ($letter->payload[$config['kind'] ?? ''] ?? '');

        foreach (['new_family', 'change_head', 'join'] as $key) {
            if (isset($config[$key]) && $config[$key]['when'] === $kind) {
                return $key;
            }
        }

        return null;
    }

    /**
     * Rencana perubahan susunan KK: [warga, perubahan] per anggota tanpa
     * menyimpan, untuk ringkasan panel Terapkan.
     *
     * @return array{kind: ?string, lines: array<int, string>}
     */
    private function restructureProposal(Letter $letter): array
    {
        $config = $letter->letterType?->data_options['restructure'] ?? [];
        $payload = is_array($letter->payload) ? $letter->payload : [];
        $kind = $this->restructureKind($letter);
        $role = fn (mixed $value): string => $this->describeValue('family_role', $value);
        $lines = [];

        if ($kind === 'new_family') {
            $new = $config['new_family'];
            $lines[] = 'Dibuatkan KK baru di '.$this->areaLabel($payload[$new['area']] ?? null).' (No. KK diisi dari KK terbitan Disdukcapil):';

            foreach ($this->restructureRows($letter, $new['rows']) as [$citizen, $shdk]) {
                $lines[] = "{$citizen->name}: {$role($shdk)}";
            }

            if ($partner = $this->villageCitizenByNik($letter, $payload[$new['partner_nik']] ?? null)) {
                $lines[] = "{$partner->name} (dari KK lain): {$role($payload[$new['partner_role']] ?? null)}";
            }

            if ($this->formsMarriedFamily($letter)) {
                $lines[] = 'Status perkawinan kepala keluarga dan suami/istri menjadi Kawin (bila belum).';
            }
        } elseif ($kind === 'change_head') {
            $change = $config['change_head'];
            $head = $this->ownFamily($letter)->firstWhere('family_role', FamilyRole::KEPALA_KELUARGA);
            $successor = $this->ownFamily($letter)->firstWhere('id', $payload[$change['head']] ?? null);
            $lines[] = ($successor?->name ?? '-').' menjadi Kepala Keluarga.';
            $lines[] = ($head?->name ?? '-').' menjadi '.$role($payload[$change['old_head_role']] ?? null).'.';
        } elseif ($kind === 'join') {
            $family = $this->familyByNumber($letter, $payload[$config['join']['no_kk']] ?? null);
            $lines[] = 'Masuk ke '.$this->familyLabel($family).':';

            foreach ($this->restructureRows($letter, $config['join']['rows']) as [$citizen, $shdk]) {
                $lines[] = "{$citizen->name}: {$role($shdk)}";
            }
        }

        if ($head = $this->newHead($letter)) {
            $lines[] = "{$head->name} menjadi kepala keluarga bagi anggota yang tetap di KK lama.";
        }

        return ['kind' => $kind, 'lines' => $lines];
    }

    /**
     * Terapkan perubahan susunan KK (F09). Anggota yang pindah KK ikut
     * mendapat wilayah dan alamat KK tujuannya.
     *
     * @return array{0: array<string, mixed>, 1: array<int, array{0: Citizen, 1: array<string, mixed>}>}
     */
    private function restructureFamily(Letter $letter, User $actor, ?string $newFamilyNumber): array
    {
        $config = $letter->letterType?->data_options['restructure'] ?? [];
        $payload = is_array($letter->payload) ? $letter->payload : [];
        $touched = [];
        $move = function (Citizen $citizen, array $data) use ($actor, &$touched): void {
            $validated = $this->validate($data, Arr::only($this->updateRules(), array_keys($data)));
            $changes = [];

            foreach ($validated as $column => $value) {
                $old = $this->scalar($citizen->getAttribute($column));

                if ($old != $value) {
                    $changes[$column] = ['old' => $old, 'new' => $value];
                }
            }

            // Dicatat sebagai `letter_fulfilled` di apply(); jangan dobel.
            $citizen = $this->citizenService->update($citizen, $validated, $actor, audit: false);
            $touched[] = [$citizen, $changes];
        };

        switch ($this->restructureKind($letter)) {
            case 'new_family':
                $new = $config['new_family'];
                $rt = Rt::query()->with('rw.hamlet')->where('village_id', $letter->village_id)->find($payload[$new['area']] ?? null);
                $address = $this->areaLabel($rt?->id);
                $family = $this->createFamily($actor, ['address' => $address], $rt, $newFamilyNumber);
                $place = ['family_id' => $family->id, 'rt_id' => $rt?->id, 'hamlet_id' => $rt?->rw?->hamlet_id, 'address' => $address];
                $members = $this->restructureRows($letter, $new['rows']);

                if ($partner = $this->villageCitizenByNik($letter, $payload[$new['partner_nik']] ?? null)) {
                    $members[] = [$partner, $payload[$new['partner_role']] ?? null];
                }

                // Kepala keluarga lebih dulu agar anggota lain masuk ke KK yang sudah berkepala.
                usort($members, fn (array $a, array $b): int => ($a[1] !== FamilyRole::KEPALA_KELUARGA->value) <=> ($b[1] !== FamilyRole::KEPALA_KELUARGA->value));

                // Membentuk keluarga baru setelah menikah: kepala keluarga dan
                // pasangannya tercatat Kawin (cukup F09 bila sudah punya buku nikah).
                $married = $this->formsMarriedFamily($letter);
                $couple = [FamilyRole::KEPALA_KELUARGA->value, FamilyRole::SUAMI->value, FamilyRole::ISTRI->value];

                foreach ($members as [$citizen, $shdk]) {
                    $marital = $married && in_array($shdk, $couple, true) ? ['marital_status' => 'kawin'] : [];
                    $move($citizen, [...$place, 'family_role' => $shdk, ...$marital]);
                }
                break;
            case 'change_head':
                $change = $config['change_head'];
                $head = $this->ownFamily($letter)->firstWhere('family_role', FamilyRole::KEPALA_KELUARGA);
                $successor = $this->ownFamily($letter)->firstWhere('id', $payload[$change['head']] ?? null)
                    ?? throw ValidationException::withMessages(['values' => ['Kepala keluarga pengganti tidak ditemukan di KK pemohon.']]);

                if ($head !== null) {
                    $move($head, ['family_role' => $payload[$change['old_head_role']] ?? null]);
                }

                $move($successor, ['family_role' => FamilyRole::KEPALA_KELUARGA->value]);
                break;
            case 'join':
                $family = $this->familyByNumber($letter, $payload[$config['join']['no_kk']] ?? null)
                    ?? throw ValidationException::withMessages(['values' => ['KK tujuan tidak ditemukan di data desa.']]);
                $place = ['family_id' => $family->id, 'rt_id' => $family->rt_id, 'hamlet_id' => $family->hamlet_id, 'address' => $family->family_address];

                foreach ($this->restructureRows($letter, $config['join']['rows']) as [$citizen, $shdk]) {
                    $move($citizen, [...array_filter($place, fn (mixed $value): bool => $value !== null), 'family_role' => $shdk]);
                }
                break;
            default:
                abort(422, 'Jenis perubahan susunan KK tidak dikenal.');
        }

        // Kepala keluarga KK lama ikut keluar: anggota pilihan pemohon menggantikannya.
        $head = $this->newHead($letter);

        if ($head !== null && $head->is_active && $head->family_id === $letter->citizen?->family_id
            && $head->family_role?->value !== FamilyRole::KEPALA_KELUARGA->value) {
            $move($head, ['family_role' => FamilyRole::KEPALA_KELUARGA->value]);
        }

        if ($touched === []) {
            abort(422, 'Tidak ada perubahan susunan KK yang dapat diterapkan dari surat ini.');
        }

        return [[
            'action' => LetterDataAction::RestructureFamily->value,
            'members' => array_map(fn (array $entry): array => ['citizen_id' => $entry[0]->id, 'name' => $entry[0]->name, 'changes' => $entry[1]], $touched),
        ], $touched];
    }

    /**
     * KK baru F09 karena membentuk keluarga baru (data_options.restructure
     * .new_family.married), bukan pisah KK.
     */
    private function formsMarriedFamily(Letter $letter): bool
    {
        $married = $letter->letterType?->data_options['restructure']['new_family']['married'] ?? null;

        return is_array($married) && $this->restructureKind($letter) === 'new_family'
            && ($letter->payload[$married['field']] ?? null) === $married['equals'];
    }

    /**
     * Anggota aktif KK pemohon (saat Terapkan).
     *
     * @return Collection<int, Citizen>
     */
    private function ownFamily(Letter $letter): Collection
    {
        return $letter->citizen?->family_id === null ? new Collection : Citizen::query()
            ->where('village_id', $letter->village_id)
            ->where('family_id', $letter->citizen->family_id)
            ->where('is_active', true)
            ->get();
    }

    /**
     * Baris repeater F09 (anggota KK pemohon + SHDK barunya).
     *
     * @return array<int, array{0: Citizen, 1: mixed}>
     */
    private function restructureRows(Letter $letter, string $field): array
    {
        $members = $this->ownFamily($letter)->keyBy('id');
        $rows = [];

        foreach ((array) ($letter->payload[$field] ?? []) as $row) {
            if (is_array($row) && isset($members[$row['anggota'] ?? ''])) {
                $rows[] = [$members[$row['anggota']], $row['shdk'] ?? null];
            }
        }

        return $rows;
    }

    private function villageCitizenByNik(Letter $letter, mixed $nik): ?Citizen
    {
        return is_string($nik) && preg_match('/^\d{16}$/', $nik) ? Citizen::query()
            ->where('village_id', $letter->village_id)
            ->where('nik_hash', hash('sha256', $nik))
            ->where('is_active', true)
            ->first() : null;
    }

    private function familyByNumber(Letter $letter, mixed $number): ?Family
    {
        return is_string($number) && $number !== '' ? Family::query()
            ->where('village_id', $letter->village_id)
            ->where('no_kk_hash', hash('sha256', $number))
            ->first() : null;
    }

    /**
     * Nilai akhir per kolom: koreksi Kasi/Kaur bila ada, selain itu nilai
     * usulan warga. Kolom di luar definisi tipe surat ditolak.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function finalValues(Letter $letter, array $values): array
    {
        $fields = $this->fields($letter);
        $columns = array_column($fields, 'column');
        $editable = array_column(
            array_filter($fields, fn (array $field): bool => ! array_key_exists('value', $field) && ! isset($field['citizen_by_nik'])),
            'column',
        );
        $unknown = array_diff(array_keys($values), $editable);

        if ($unknown !== []) {
            throw ValidationException::withMessages([
                'values' => ['Kolom tidak boleh diubah lewat jenis surat ini: '.implode(', ', $unknown).'.'],
            ]);
        }

        $final = [];
        $proposed = $this->proposedValues($letter);

        foreach ($columns as $column) {
            if (array_key_exists($column, $values)) {
                $final[$column] = $values[$column];
            } elseif (($proposed[$column] ?? null) !== null) {
                $final[$column] = $proposed[$column];
            }
        }

        return $final;
    }

    /**
     * @return array<string, mixed>
     */
    private function proposedValues(Letter $letter): array
    {
        $payload = is_array($letter->payload) ? $letter->payload : [];
        $proposed = [];

        foreach ($this->fields($letter) as $field) {
            if (array_key_exists('value', $field)) {
                $proposed[$field['column']] = $field['value'];

                continue;
            }

            $source = $field['source'] ?? null;
            $value = $source !== null ? ($payload[$source] ?? null) : null;

            // `citizen_by_nik`: id warga desa ber-NIK isian itu (mis. ayah
            // yang mengakui anak), kosong bila tidak terdata.
            if (isset($field['citizen_by_nik'])) {
                $nik = (string) ($payload[$field['citizen_by_nik']] ?? '');
                $value = $nik === '' ? null : Citizen::query()
                    ->where('village_id', $letter->village_id)
                    ->where('nik_hash', hash('sha256', $nik))
                    ->where('is_active', true)
                    ->value('id');
            }

            // `map`: jawaban isian diterjemahkan ke nilai kolom (mis.
            // perkawinan -> kawin).
            if (isset($field['map'])) {
                $value = $field['map'][(string) $value] ?? null;
            }

            $proposed[$field['column']] = $value === '' ? null : $value;
        }

        return $proposed;
    }

    /**
     * Definisi dari tipe surat, dibatasi ke kolom yang memang boleh
     * disentuh lewat surat untuk aksi tersebut.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fields(Letter $letter): array
    {
        $rules = $this->actionOf($letter) === LetterDataAction::CreateCitizen
            ? $this->createRules()
            : $this->updateRules();

        return array_values(array_filter(
            $letter->letterType?->data_fields ?? [],
            fn (array $field): bool => isset($field['column']) && array_key_exists($field['column'], $rules),
        ));
    }

    /**
     * Warga yang datanya diubah: pemohon, atau - bila jenis surat
     * menetapkan data_subject_field - warga desa ber-NIK sesuai isian form
     * (boleh dikoreksi Kasi/Kaur saat Terapkan).
     */
    private function subjectCitizen(Letter $letter, ?string $overrideNik): ?Citizen
    {
        $subjectField = $letter->letterType?->data_subject_field;

        if ($subjectField === null) {
            return $letter->citizen;
        }

        $nik = $overrideNik ?: ($letter->payload[$subjectField] ?? null);

        if (! is_string($nik) || $nik === '') {
            return null;
        }

        return Citizen::query()
            ->where('village_id', $letter->village_id)
            ->where('nik_hash', hash('sha256', $nik))
            ->first();
    }

    private function actionOf(Letter $letter): LetterDataAction
    {
        return $letter->letterType?->data_action ?? LetterDataAction::None;
    }

    /**
     * Aturan nilai disamakan dengan form data warga milik Petugas Desa
     * supaya tidak ada dua definisi yang bisa berbeda.
     *
     * @return array<string, mixed>
     */
    private function updateRules(): array
    {
        $rules = Arr::except((new UpdateCitizenRequest)->rules(), ['nik', 'no_kk', 'last_verified_at']);
        $rules['is_active'] = ['boolean'];

        return $rules;
    }

    /**
     * @return array<string, mixed>
     */
    private function createRules(): array
    {
        return Arr::except((new StoreCitizenRequest)->rules(), ['no_kk']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    private function validate(array $data, array $rules): array
    {
        // Nama atribut memakai label kolom (lang/id/validation.php), bukan
        // "values.nik", supaya pesan validasi terbaca wajar.
        $attributes = collect($rules)
            ->mapWithKeys(function ($rule, string $column) {
                $key = "validation.attributes.{$column}";
                $label = trans($key);

                return ["values.{$column}" => $label === $key ? str_replace('_', ' ', $column) : $label];
            })
            ->all();

        $validator = Validator::make(['values' => $data], collect($rules)
            ->mapWithKeys(fn ($rule, string $column) => ["values.{$column}" => $rule])
            ->all(), [], $attributes);

        return $validator->validate()['values'] ?? [];
    }

    private function scalar(mixed $value): mixed
    {
        return match (true) {
            $value instanceof \BackedEnum => $value->value,
            $value instanceof \DateTimeInterface => $value->format('Y-m-d'),
            default => $value,
        };
    }
}
