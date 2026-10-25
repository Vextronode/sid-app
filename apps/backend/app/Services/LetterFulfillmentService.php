<?php

namespace App\Services;

use App\Enums\LetterDataAction;
use App\Enums\LetterResultStage;
use App\Enums\LetterStatus;
use App\Http\Requests\StoreCitizenRequest;
use App\Http\Requests\UpdateCitizenRequest;
use App\Models\Citizen;
use App\Models\Letter;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use App\Repositories\UserRepository;
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
 */
class LetterFulfillmentService
{
    /** Kolom yang nilainya mengikuti pemohon bila tidak diisi saat tambah warga. */
    private const INHERITED_FROM_APPLICANT = ['rt_id', 'hamlet_id', 'family_id', 'address'];

    public function __construct(
        protected LetterRepository $letterRepository,
        protected CitizenService $citizenService,
        protected OfficialService $officialService,
        protected UserRepository $userRepository,
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

        return [
            'action' => $action->value,
            'fulfilled_at' => $letter->fulfilled_at,
            'fulfilled_by' => $letter->fulfilled_by,
            'result' => $letter->fulfillment,
            'instructions' => $action === LetterDataAction::Manual ? $letter->letterType?->data_instructions : null,
            'members' => $action === LetterDataAction::DeactivateMembers ? $this->memberProposal($letter) : [],
            // Diisi bila subjek perubahan bukan pemohon (mis. almarhum):
            // warga dicari lewat NIK yang ditulis pemohon di form.
            'subject' => $subjectField === null || $action !== LetterDataAction::UpdateCitizen ? null : [
                'nik' => $letter->payload[$subjectField] ?? null,
                'found' => $current !== null,
                'name' => $current?->name,
            ],
            'fields' => array_map(fn (array $field): array => [
                'column' => $field['column'],
                'label' => $field['label'] ?? $field['column'],
                'source' => $field['source'] ?? null,
                'current' => $current ? $this->scalar($current->getAttribute($field['column'])) : null,
                'proposed' => $proposed[$field['column']] ?? null,
                // Nilai tetap dari jenis surat; tidak dapat dikoreksi.
                'fixed' => array_key_exists('value', $field),
                'display' => $field['value_label'] ?? null,
            ], $this->fields($letter)),
        ];
    }

    /**
     * @param  array<string, mixed>  $values  koreksi dari Kasi/Kaur, per kolom
     * @param  string|null  $subjectNik  koreksi NIK subjek, bila subjeknya bukan pemohon
     * @param  string|null  $notes  catatan "Tandai selesai" untuk aksi manual
     */
    public function apply(Letter $letter, User $actor, array $values, ?string $subjectNik = null, ?string $notes = null): Letter
    {
        return DB::transaction(function () use ($letter, $actor, $values, $subjectNik, $notes): Letter {
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

            // Daftar [warga, perubahan] untuk jejak audit per warga.
            [$result, $touched] = match ($action) {
                LetterDataAction::UpdateCitizen, LetterDataAction::CreateCitizen => $this->singleCitizen(
                    $action,
                    $action === LetterDataAction::UpdateCitizen
                        ? $this->updateCitizen($locked, $actor, $this->finalValues($locked, $values), $subjectNik)
                        : $this->createCitizen($locked, $actor, $this->finalValues($locked, $values)),
                ),
                LetterDataAction::DeactivateMembers => $this->deactivateMembers($locked, $actor),
                LetterDataAction::Manual => [['action' => $action->value, 'notes' => $notes], []],
                default => abort(422, 'Jenis surat ini tidak memiliki aksi perubahan data.'),
            };

            $this->letterRepository->update($locked, [
                'fulfilled_at' => now(),
                'fulfilled_by' => $actor->id,
                'fulfillment' => $result,
            ]);

            $this->letterRepository->createStatusLogForLetter($locked, [
                'actor_id' => $actor->id,
                'old_status' => LetterStatus::Approved->value,
                'new_status' => LetterStatus::Approved->value,
                'reason' => $action === LetterDataAction::Manual
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

            return $locked;
        });
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
     *
     * @return array{0: array<string, mixed>, 1: array<int, array{0: Citizen, 1: array<string, mixed>}>}
     */
    private function deactivateMembers(Letter $letter, User $actor): array
    {
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

        return [['action' => LetterDataAction::DeactivateMembers->value, 'members' => $members], $touched];
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
    private function createCitizen(Letter $letter, User $actor, array $final): array
    {
        $applicant = $letter->citizen;

        foreach (self::INHERITED_FROM_APPLICANT as $column) {
            if (! array_key_exists($column, $final) && $applicant?->getAttribute($column) !== null) {
                $final[$column] = $applicant->getAttribute($column);
            }
        }

        $allowed = array_merge(array_column($this->fields($letter), 'column'), self::INHERITED_FROM_APPLICANT);
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
            array_filter($fields, fn (array $field): bool => ! array_key_exists('value', $field)),
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
