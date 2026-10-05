<?php

namespace App\Services;

use App\Enums\OfficialPosition;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\Auth\UsernameGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use RuntimeException;

class OfficialAssignmentService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected UserRepository $userRepository,
        protected LetterRepository $letterRepository,
        protected OfficialService $officialService,
        protected UsernameGenerator $usernameGenerator,
    ) {}

    public function promote(User $actor, array $data): Official
    {
        return DB::transaction(function () use ($actor, $data): Official {
            $this->assertActivePetugas($actor);

            return $this->promoteInTransaction($actor, $data);
        });
    }

    /**
     * @return array{official: Official, warnings: array<int, array<string, mixed>>}
     */
    public function demote(User $actor, Official $official, ?string $notes = null): array
    {
        return DB::transaction(function () use ($actor, $official, $notes): array {
            $this->assertActivePetugas($actor);
            $this->assertOfficialInActorVillage($actor, $official);

            return $this->demoteInTransaction($actor, $official, $notes);
        });
    }

    /**
     * @return array{old_official: Official, new_official: Official, warnings: array<int, array<string, mixed>>}
     */
    public function rotate(User $actor, Official $old, array $data): array
    {
        if ($old->position === OfficialPosition::PetugasDesa->value) {
            abort(422, 'Gunakan promote/demote untuk Petugas Desa.');
        }

        return DB::transaction(function () use ($actor, $old, $data): array {
            $this->assertActivePetugas($actor);
            $this->assertOfficialInActorVillage($actor, $old);
            $demotion = $this->demoteInTransaction($actor, $old, $data['notes'] ?? null);

            $newOfficial = $this->promoteInTransaction($actor, array_merge($data, [
                'position' => $old->position,
                'village_id' => $old->village_id,
                'rt_id' => $old->rt_id,
                'rw_id' => $old->rw_id,
                'hamlet_id' => $old->hamlet_id,
            ]));

            $this->logActivity($actor, $old, 'rotated', [
                'new_official_id' => $newOfficial->id,
                'new_user_id' => $newOfficial->user_id,
            ]);

            return [
                'old_official' => $demotion['official'],
                'new_official' => $newOfficial,
                // The replacement is promoted in this transaction, so
                // demotion warnings about a vacant position no longer apply.
                'warnings' => [],
            ];
        });
    }

    /** Create or reuse a citizen and account, then make the first Petugas Desa. */
    public function bootstrapFirstPetugas(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            // Lock the village rows so concurrent bootstrap invocations serialize,
            // including when no Petugas Desa row exists yet.
            Village::query()->orderBy('id')->lockForUpdate()->get(['id']);

            if ($this->userRepository->countActiveByRole(OfficialPosition::PetugasDesa->userRole()->value) > 0) {
                throw new RuntimeException('Petugas Desa aktif sudah tersedia.');
            }

            $citizen = Citizen::query()
                ->where('nik_hash', hash('sha256', $data['nik']))
                ->lockForUpdate()
                ->first();

            if (! $citizen) {
                $validator = Validator::make($data, [
                    'name' => ['required', 'string', 'max:100'],
                    'date_of_birth' => ['required', 'date'],
                    'gender' => ['required', Rule::in(['L', 'P'])],
                    'address' => ['required', 'string'],
                    'village_id' => ['required', 'uuid', 'exists:villages,id'],
                    'rt_id' => ['required', 'integer', 'exists:rts,id'],
                    'hamlet_id' => ['nullable', 'integer', 'exists:hamlets,id'],
                ]);
                $validator->validate();

                $rt = Rt::query()->whereKey($data['rt_id'])->first();
                if (! $rt || $rt->village_id !== $data['village_id']) {
                    throw new RuntimeException('RT harus berasal dari desa yang dipilih.');
                }

                if (! empty($data['hamlet_id']) && ! Hamlet::query()->whereKey($data['hamlet_id'])->where('village_id', $data['village_id'])->exists()) {
                    throw new RuntimeException('Dusun harus berasal dari desa yang dipilih.');
                }

                $citizen = Citizen::create([
                    'nik' => $data['nik'],
                    'name' => $data['name'],
                    'date_of_birth' => $data['date_of_birth'],
                    'gender' => $data['gender'],
                    'address' => $data['address'],
                    'village_id' => $data['village_id'],
                    'rt_id' => $data['rt_id'],
                    'hamlet_id' => $data['hamlet_id'] ?: null,
                    'data_source' => 'manual_input_desa',
                    'is_active' => true,
                ]);
            }

            if (! $citizen->is_active) {
                throw new RuntimeException('Data citizen tidak aktif.');
            }

            $target = User::query()->where('citizen_id', $citizen->id)->lockForUpdate()->first();
            if ($target && (! $target->is_active || $target->role !== 'warga' || $target->village_id !== $citizen->village_id)) {
                throw new RuntimeException('Akun yang terhubung harus akun warga aktif dari desa yang sama.');
            }
            if ($target && $this->officialRepository->existsActiveForUser($target->id)) {
                throw new RuntimeException('Akun ini sudah memiliki jabatan aktif.');
            }

            $temporaryPassword = Str::password(32);
            if (! $target) {
                $target = $this->userRepository->create([
                    'citizen_id' => $citizen->id,
                    'village_id' => $citizen->village_id,
                    'name' => $citizen->name,
                    'username' => $this->usernameGenerator->generate($citizen->name),
                    'role' => 'warga',
                    'is_active' => true,
                    'password' => $temporaryPassword,
                    'must_change_password' => true,
                ]);
            } else {
                $target->update([
                    'password' => $temporaryPassword,
                    'must_change_password' => true,
                ]);
            }

            $official = $this->officialRepository->create([
                'citizen_id' => $target->citizen_id,
                'user_id' => $target->id,
                'position' => OfficialPosition::PetugasDesa->value,
                'village_id' => $citizen->village_id,
                'started_at' => today(),
                'is_active' => true,
            ]);

            $this->userRepository->updateRole($target->id, OfficialPosition::PetugasDesa->userRole()->value);
            $this->logActivity(null, $official, 'promoted', [
                'user_id' => $target->id,
                'position' => OfficialPosition::PetugasDesa->value,
                'bootstrap' => true,
            ]);

            return ['user' => $target->fresh(), 'temporary_password' => $temporaryPassword];
        });
    }

    private function promoteInTransaction(User $actor, array $data): Official
    {
        $this->assertActivePetugas($actor);
        $target = User::query()->findOrFail($data['user_id']);

        if (
            ! $target->is_active ||
            $target->role !== 'warga' ||
            $target->citizen_id === null ||
            $target->village_id !== $actor->village_id ||
            $this->officialRepository->existsActiveForUser($target->id)
        ) {
            abort(422, 'Akun target harus warga aktif yang belum menjabat dan terhubung ke data kependudukan.');
        }

        $position = OfficialPosition::tryFrom($data['position'] ?? '');

        if ($position === null || ! $position->hasAccount()) {
            abort(422, 'Posisi jabatan tidak dapat ditetapkan ke akun.');
        }

        $scopeColumn = $position->scopeColumn();
        $officialData = [
            'citizen_id' => $target->citizen_id,
            'user_id' => $target->id,
            'position' => $position->value,
            'village_id' => $target->village_id,
            'rt_id' => $scopeColumn === 'rt_id' ? ($data['rt_id'] ?? null) : null,
            'rw_id' => $scopeColumn === 'rw_id' ? ($data['rw_id'] ?? null) : null,
            'hamlet_id' => $scopeColumn === 'hamlet_id' ? ($data['hamlet_id'] ?? null) : null,
            'started_at' => $data['started_at'],
            'term_ends_at' => $data['term_ends_at'] ?? null,
            'phone_wa' => $data['phone_wa'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_active' => true,
        ];
        foreach ([
            'rt_id' => Rt::class,
            'rw_id' => Rw::class,
            'hamlet_id' => Hamlet::class,
        ] as $field => $model) {
            if ($officialData[$field] !== null && ! $model::query()->whereKey($officialData[$field])->where('village_id', $target->village_id)->exists()) {
                abort(422, 'Wilayah jabatan harus berasal dari desa akun target.');
            }
        }
        $this->officialService->assertPositionAvailable($officialData);

        $official = $this->officialRepository->create($officialData);
        $this->userRepository->updateRole($target->id, $position->userRole()->value);

        $this->logActivity($actor, $official, 'promoted', [
            'user_id' => $target->id,
            'position' => $position->value,
        ]);

        return $official;
    }

    /**
     * @return array{official: Official, warnings: array<int, array<string, mixed>>}
     */
    private function demoteInTransaction(
        ?User $actor,
        Official $official,
        ?string $notes,
        bool $skipSelfGuard = false,
        bool $skipLastPetugasGuard = false,
    ): array {
        if (! $official->is_active || $official->user_id === null) {
            abort(422, 'Hanya jabatan aktif yang terhubung ke akun yang dapat diturunkan.');
        }

        $target = User::query()->findOrFail($official->user_id);

        if ($target->village_id !== $official->village_id) {
            abort(409, 'Akun pejabat tidak sesuai dengan desa jabatannya.');
        }

        if ($official->position === OfficialPosition::PetugasDesa->value) {
            $activePetugasCount = $this->userRepository->countActiveByRole(OfficialPosition::PetugasDesa->userRole()->value, $target->village_id);

            if (! $skipSelfGuard && $actor?->is($target)) {
                if ($activePetugasCount <= 1 && ! $skipLastPetugasGuard) {
                    abort(403, 'Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.');
                }

                abort(403, 'Anda tidak dapat menurunkan diri sendiri. Minta petugas lain untuk menurunkan Anda.');
            }

            if ($activePetugasCount <= 1 && ! $skipLastPetugasGuard) {
                abort(409, 'Aksi gagal karena petugas desa tidak boleh kosong.');
            }
        }

        $warnings = $this->warningsForDemotion($official);
        $updatedNotes = trim(implode("\n", array_filter([$official->notes, $notes])));
        $this->officialRepository->update($official, [
            'is_active' => false,
            'ended_at' => today(),
            'notes' => $updatedNotes !== '' ? $updatedNotes : null,
        ]);
        $this->userRepository->updateRole($target->id, 'warga');

        $official = $official->fresh();
        $this->logActivity($actor, $official, 'demoted', [
            'user_id' => $target->id,
            'position' => $official->position,
            'warnings' => $warnings,
        ]);

        return ['official' => $official, 'warnings' => $warnings];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function warningsForDemotion(Official $official): array
    {
        $position = $official->position;
        $count = 0;

        if ($position === OfficialPosition::Rt->value) {
            $count = $this->letterRepository->countWaitingAtStep(['rt'], $official->village_id, $official->rt_id);
        } elseif (in_array($position, [OfficialPosition::KepalaDesa->value, OfficialPosition::Sekdes->value], true)) {
            $hasOtherApprover = $this->officialRepository
                ->allActiveByPositionsAndVillage(['kepala_desa', 'sekdes'], $official->village_id)
                ->contains(fn (Official $candidate) => $candidate->id !== $official->id);

            if (! $hasOtherApprover) {
                $count = $this->letterRepository->countWaitingAtStep(['kepala_desa'], $official->village_id);
            }
        }

        if ($count === 0) {
            return [];
        }

        return [[
            'code' => 'letters_without_approver',
            'position' => $position,
            'count' => $count,
            'message' => "Ada {$count} surat menunggu tahap {$position} yang akan kehilangan pejabat berwenang.",
        ]];
    }

    private function assertActivePetugas(User $actor): void
    {
        if ($actor->role !== OfficialPosition::PetugasDesa->userRole()->value || ! $actor->is_active || ! $actor->village_id) {
            abort(403, 'Aksi ini hanya dapat dilakukan oleh Petugas Desa aktif.');
        }
    }

    private function assertOfficialInActorVillage(User $actor, Official $official): void
    {
        if ($official->village_id !== $actor->village_id) {
            abort(404, 'Data pejabat tidak ditemukan.');
        }
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function logActivity(?User $actor, Official $official, string $event, array $properties): void
    {
        $logger = activity('official');

        if ($actor !== null) {
            $logger->causedBy($actor);
        }

        $logger->performedOn($official)
            ->withProperties($properties)
            ->log($event);
    }
}
