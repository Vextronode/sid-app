<?php

namespace App\Services;

use App\Enums\OfficialPosition;
use App\Enums\UserRole;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use App\Notifications\LetterStatusNotification;
use App\Repositories\LetterRepository;
use App\Repositories\OfficialPositionTypeRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\UserRepository;
use App\Services\Auth\UsernameGenerator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

class OfficialAssignmentService
{
    public function __construct(
        protected OfficialRepository $officialRepository,
        protected UserRepository $userRepository,
        protected LetterRepository $letterRepository,
        protected OfficialService $officialService,
        protected UsernameGenerator $usernameGenerator,
        protected UserSignatureService $userSignatureService,
        protected OfficialPositionTypeRepository $positionTypes = new OfficialPositionTypeRepository,
    ) {}

    public function promote(User $actor, array $data): Official
    {
        return $this->withStoredPhoto($actor, $data, fn (array $data): Official => DB::transaction(function () use ($actor, $data): Official {
            $this->assertActivePetugas($actor);

            return $this->promoteInTransaction($actor, $data);
        }));
    }

    /**
     * Mencari calon pejabat lewat NIK di desa Petugas. Dipakai form
     * penetapan dan rotasi, supaya pejabat dipilih dari identitas
     * kependudukannya, bukan dari nama akun. Jabatan yang punya akun
     * mensyaratkan akun warga aktif; jabatan tanpa akun cukup data warga.
     *
     * @return array{citizen_id: string, user_id: ?string, name: string, username: ?string, eligible: bool, reason: ?string}
     */
    public function findCandidateByNik(User $actor, string $nik, ?string $position = null): array
    {
        $this->assertActivePetugas($actor);

        $citizen = Citizen::query()
            ->where('village_id', $actor->village_id)
            ->where('nik_hash', hash('sha256', $nik))
            ->first();

        if ($citizen === null) {
            abort(404, 'NIK tidak ditemukan di data warga desa ini.');
        }

        $user = $this->userRepository->findByCitizenId($citizen->id);
        // Tanpa jabatan, diasumsikan jabatan berakun (syarat paling ketat).
        $needsAccount = $position === null || OfficialPosition::tryFrom($position) !== null;
        $serving = 'Warga ini sedang menjabat. Akhiri jabatannya lebih dulu.';

        $reason = match (true) {
            ! $citizen->is_active => 'Data warga ini sedang nonaktif.',
            $this->officialRepository->findActiveByCitizenId($citizen->id) !== null => $serving,
            $user === null => $needsAccount ? 'Warga ini belum memiliki akun. Minta yang bersangkutan mendaftar lebih dulu.' : null,
            $user->role !== 'warga', $this->officialRepository->existsActiveForUser($user->id) => $serving,
            ! $user->is_active => $needsAccount ? 'Akun warga ini sedang nonaktif.' : null,
            default => null,
        };

        return [
            'citizen_id' => $citizen->id,
            'user_id' => $user?->id,
            'name' => $citizen->name,
            'username' => $user?->username,
            'eligible' => $reason === null,
            'reason' => $reason,
        ];
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
        return $this->withStoredPhoto($actor, $data, fn (array $data): array => DB::transaction(function () use ($actor, $old, $data): array {
            $this->assertActivePetugas($actor);
            $this->assertOfficialInActorVillage($actor, $old);

            // Staf aplikasi hanya satu dan boleh menyerahkan jabatannya
            // sendiri: penggantinya dipromosikan di transaksi ini juga, jadi
            // jabatan tidak pernah kosong. $actor di memori tetap berperan
            // staf_sid (updateRole memakai query), sehingga promosi di bawah
            // tetap lolos assertActivePetugas meski ia merotasi dirinya.
            $isStafSid = $old->position === OfficialPosition::StafSid->value;
            $demotion = $this->demoteInTransaction(
                $actor,
                $old,
                $data['notes'] ?? null,
                skipSelfGuard: $isStafSid,
                skipLastPetugasGuard: $isStafSid,
            );

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
        }));
    }

    /**
     * Foto pejabat disimpan sebelum transaksi dan dihapus lagi bila
     * penetapan gagal, supaya tidak ada berkas tanpa baris pejabat.
     *
     * @template T
     *
     * @param  array<string, mixed>  $data
     * @param  callable(array<string, mixed>): T  $assign
     * @return T
     */
    private function withStoredPhoto(User $actor, array $data, callable $assign): mixed
    {
        $photo = $data['photo'] ?? null;
        unset($data['photo'], $data['photo_img']);

        if (! $photo instanceof UploadedFile) {
            return $assign($data);
        }

        $this->assertActivePetugas($actor);
        $data['photo_img'] = $this->officialService->storePhoto($photo, $actor->village_id);

        try {
            return $assign($data);
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($data['photo_img']);
            throw $exception;
        }
    }

    /** Create or reuse a citizen and account, then make the first Petugas Desa. */
    public function bootstrapFirstPetugas(array $data): array
    {
        return DB::transaction(function () use ($data): array {
            // Lock the village rows so concurrent bootstrap invocations serialize,
            // including when no Petugas Desa row exists yet.
            Village::query()->orderBy('id')->lockForUpdate()->get(['id']);

            if ($this->userRepository->countActiveByRole(OfficialPosition::StafSid->userRole()->value) > 0) {
                throw new RuntimeException(UserRole::stafSidLabel().' aktif sudah tersedia.');
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
                'position' => OfficialPosition::StafSid->value,
                'village_id' => $citizen->village_id,
                'started_at' => today(),
                'is_active' => true,
            ]);

            $this->userRepository->updateRole($target->id, OfficialPosition::StafSid->userRole()->value);
            $this->logActivity(null, $official, 'promoted', [
                'user_id' => $target->id,
                'position' => OfficialPosition::StafSid->value,
                'bootstrap' => true,
            ]);

            return ['user' => $target->fresh(), 'temporary_password' => $temporaryPassword];
        });
    }

    private function promoteInTransaction(User $actor, array $data): Official
    {
        $this->assertActivePetugas($actor);
        // Jabatan berakun ada di enum; selain itu harus jenis jabatan aktif
        // milik desa Petugas.
        $position = OfficialPosition::tryFrom($data['position'] ?? '');
        $positionCode = $position?->value
            ?? $this->positionTypes->findByCode($actor->village_id, (string) ($data['position'] ?? ''), activeOnly: true)?->code;

        if ($positionCode === null) {
            abort(422, 'Posisi jabatan tidak dikenal.');
        }

        $target = $position !== null
            ? $this->resolveAccountTarget($actor, $data)
            : null;
        $citizenId = $target?->citizen_id ?? $this->resolveCitizenTarget($actor, $data)->id;

        $scopeColumn = $position?->scopeColumn();
        $officialData = [
            'citizen_id' => $citizenId,
            'user_id' => $target?->id,
            'position' => $positionCode,
            'village_id' => $actor->village_id,
            'rt_id' => $scopeColumn === 'rt_id' ? ($data['rt_id'] ?? null) : null,
            'rw_id' => $scopeColumn === 'rw_id' ? ($data['rw_id'] ?? null) : null,
            'hamlet_id' => $scopeColumn === 'hamlet_id' ? ($data['hamlet_id'] ?? null) : null,
            'started_at' => $data['started_at'],
            'term_ends_at' => $data['term_ends_at'] ?? null,
            'phone_wa' => $data['phone_wa'] ?? null,
            'photo_img' => $data['photo_img'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_active' => true,
        ];
        foreach ([
            'rt_id' => Rt::class,
            'rw_id' => Rw::class,
            'hamlet_id' => Hamlet::class,
        ] as $field => $model) {
            if ($officialData[$field] !== null && ! $model::query()->whereKey($officialData[$field])->where('village_id', $actor->village_id)->exists()) {
                abort(422, 'Wilayah jabatan harus berasal dari desa akun target.');
            }
        }
        $this->officialService->assertPositionAvailable($officialData);

        $official = $this->officialRepository->create($officialData);

        if ($target !== null) {
            $this->userRepository->updateRole($target->id, $position->userRole()->value);
            // TTD jabatan disalin dari TTD akun pejabatnya (selain Kepala Desa).
            $this->userSignatureService->syncActiveOfficials($target);
        }

        $this->logActivity($actor, $official, 'promoted', [
            'user_id' => $target?->id,
            'position' => $positionCode,
        ]);

        if ($target !== null) {
            $this->notifyLettersWaitingForNewRt($official, $target);
        }

        return $official;
    }

    /**
     * Jabatan yang punya akun: targetnya akun warga aktif yang belum
     * menjabat, di desa Petugas.
     *
     * @param  array<string, mixed>  $data
     */
    private function resolveAccountTarget(User $actor, array $data): User
    {
        $target = User::query()->find($data['user_id'] ?? null);

        if (
            $target === null ||
            ! $target->is_active ||
            $target->role !== 'warga' ||
            $target->citizen_id === null ||
            $target->village_id !== $actor->village_id ||
            $this->officialRepository->existsActiveForUser($target->id) ||
            $this->officialRepository->findActiveByCitizenId($target->citizen_id) !== null
        ) {
            abort(422, 'Akun target harus warga aktif yang belum menjabat dan terhubung ke data kependudukan.');
        }

        return $target;
    }

    /**
     * Jabatan tanpa akun: targetnya data warga aktif di desa Petugas
     * yang belum menjabat. Akun tidak disyaratkan dan perannya tidak berubah.
     *
     * @param  array<string, mixed>  $data
     */
    private function resolveCitizenTarget(User $actor, array $data): Citizen
    {
        $citizen = Citizen::query()
            ->where('village_id', $actor->village_id)
            ->find($data['citizen_id'] ?? null);
        $account = $citizen ? $this->userRepository->findByCitizenId($citizen->id) : null;

        if (
            $citizen === null ||
            ! $citizen->is_active ||
            $this->officialRepository->findActiveByCitizenId($citizen->id) !== null ||
            ($account !== null && $account->role !== 'warga')
        ) {
            abort(422, 'Warga target harus warga aktif desa ini yang belum menjabat.');
        }

        return $citizen;
    }

    /**
     * Surat yang tertahan di step RT saat jabatan RT kosong tidak pernah
     * mengirim notifikasi ke approver. Begitu RT ditetapkan, pejabat baru
     * diberi tahu tentang surat yang sudah menunggunya.
     */
    private function notifyLettersWaitingForNewRt(Official $official, User $target): void
    {
        if ($official->position !== OfficialPosition::Rt->value || $official->rt_id === null) {
            return;
        }

        $query = $this->letterRepository->queryPendingAtFlowStepPositions(
            ['rt'],
            $official->village_id,
            $target->id,
            $target->citizen_id,
        );
        $this->letterRepository->whereCitizenRtId($query, $official->rt_id);

        foreach ($query->get() as $letter) {
            $target->notify(new LetterStatusNotification(
                $letter,
                'Permohonan Surat Menunggu',
                'Ada permohonan surat yang menunggu verifikasi Anda.',
                'pending',
            ));
        }
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
        if (! $official->is_active) {
            abort(422, 'Hanya jabatan aktif yang dapat diturunkan.');
        }

        // Jabatan tanpa akun tidak punya peran untuk dikembalikan.
        $target = $official->user_id !== null
            ? User::query()->findOrFail($official->user_id)
            : null;

        if ($target !== null && $target->village_id !== $official->village_id) {
            abort(409, 'Akun pejabat tidak sesuai dengan desa jabatannya.');
        }

        if ($target !== null && $official->position === OfficialPosition::StafSid->value) {
            $activePetugasCount = $this->userRepository->countActiveByRole(OfficialPosition::StafSid->userRole()->value, $target->village_id);

            if (! $skipSelfGuard && $actor?->is($target)) {
                if ($activePetugasCount <= 1 && ! $skipLastPetugasGuard) {
                    abort(403, 'Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong.');
                }

                abort(403, 'Anda tidak dapat menurunkan diri sendiri. Minta petugas lain untuk menurunkan Anda.');
            }

            if ($activePetugasCount <= 1 && ! $skipLastPetugasGuard) {
                abort(409, 'Aksi gagal karena '.UserRole::stafSidLabel().' tidak boleh kosong.');
            }
        }

        $warnings = $this->warningsForDemotion($official);
        $updatedNotes = trim(implode("\n", array_filter([$official->notes, $notes])));
        $this->officialRepository->update($official, [
            'is_active' => false,
            'ended_at' => today(),
            'notes' => $updatedNotes !== '' ? $updatedNotes : null,
        ]);
        if ($target !== null) {
            $this->userRepository->updateRole($target->id, 'warga');
        }

        $official = $official->fresh();
        $this->logActivity($actor, $official, 'demoted', [
            'user_id' => $target?->id,
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
        } elseif (in_array($position, [OfficialPosition::KepalaDesa->value, OfficialPosition::SekretarisDesa->value], true)) {
            $hasOtherApprover = $this->officialRepository
                ->allActiveByPositionsAndVillage(['kepala_desa', 'sekretaris_desa'], $official->village_id)
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
        if ($actor->role !== OfficialPosition::StafSid->userRole()->value || ! $actor->is_active || ! $actor->village_id) {
            abort(403, 'Aksi ini hanya dapat dilakukan oleh '.UserRole::stafSidLabel().' aktif.');
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
