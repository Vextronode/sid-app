<?php

namespace App\Services;

use App\Models\User;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgMemberRepository;
use App\Repositories\VillageOrgPositionRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VillageOrgMemberService
{
    public function __construct(
        private readonly VillageOrgMemberRepository $repository,
        private readonly VillageOrgPositionRepository $positionRepository,
    ) {}

    /**
     * Mengisi slot. Untuk Ketua/Wakil Ketua, pemegang lama diakhiri masa
     * jabatannya (masuk riwayat) atau, dengan previous_holder=to_member,
     * dipindah menjadi Anggota. Dengan from_member_id, yang diisikan adalah
     * anggota/wakil aktif organisasi yang sama (promosi): jabatan lamanya
     * diakhiri dan datanya disalin ke slot ini.
     */
    public function addOrRotate(User $user, VillageOrgPosition $position, array $data): VillageOrgMember
    {
        $this->guardBelongsToVillage($user, $position);
        $this->guardFeatureEnabled($position);

        return DB::transaction(function () use ($position, $data) {
            $startedAt = $data['started_at'];
            $source = isset($data['from_member_id'])
                ? $this->resolvePromotionSource($position, (int) $data['from_member_id'])
                : null;

            if ($position->is_single_occupant) {
                foreach ($this->repository->activeForPosition($position->id) as $activeMember) {
                    $this->repository->endMembership($activeMember, $startedAt);

                    if (($data['previous_holder'] ?? 'end') === 'to_member') {
                        $this->createMemberFrom($position, $activeMember, $startedAt);
                    }
                }
            }

            if ($source !== null) {
                $this->repository->endMembership($source, $startedAt);
            }

            return $this->repository->create([
                'position_id' => $position->id,
                'member_name' => $source?->member_name ?? $data['member_name'],
                'photo_img' => $source?->photo_img,
                'phone_wa' => $source?->phone_wa ?? ($data['phone_wa'] ?? null),
                'started_at' => $startedAt,
                'ended_at' => null,
                'is_active' => true,
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    public function update(User $user, VillageOrgPosition $position, int $id, array $data): VillageOrgMember
    {
        $this->guardBelongsToVillage($user, $position);

        $member = $this->repository->findByIdOrFail($id);
        $this->guardBelongsToPosition($member, $position);

        return $this->repository->update($member, $data);
    }

    /**
     * Mengakhiri pemegang Ketua/Wakil Ketua sehingga slotnya kosong, atau
     * dengan to_member=true sekaligus menurunkannya menjadi Anggota.
     */
    public function end(User $user, VillageOrgPosition $position, int $id, array $data): VillageOrgMember
    {
        $this->guardBelongsToVillage($user, $position);

        $member = $this->repository->findByIdOrFail($id);
        $this->guardBelongsToPosition($member, $position);

        if (! $position->is_single_occupant) {
            throw new HttpException(422, 'Anggota cukup dihapus, tidak perlu diakhiri.');
        }

        if (! $member->is_active) {
            throw new HttpException(422, 'Masa jabatan anggota ini sudah berakhir.');
        }

        $endedAt = $data['ended_at'] ?? now()->toDateString();

        return DB::transaction(function () use ($position, $member, $endedAt, $data) {
            $this->repository->endMembership($member, $endedAt);

            if ($data['to_member'] ?? false) {
                $this->createMemberFrom($position, $member, $endedAt);
            }

            return $member;
        });
    }

    public function delete(User $user, VillageOrgPosition $position, int $id): void
    {
        $this->guardBelongsToVillage($user, $position);

        $member = $this->repository->findByIdOrFail($id);
        $this->guardBelongsToPosition($member, $position);

        if ($position->is_single_occupant && $member->is_active) {
            throw new HttpException(
                422,
                'Pemegang jabatan aktif tidak bisa dihapus. Kosongkan atau ganti jabatannya terlebih dahulu.'
            );
        }

        $photo = $member->photo_img;
        $this->repository->delete($member);
        $this->deletePhotoFile($photo, $member->id);
    }

    /**
     * Unggah atau ganti foto profil. Berkas lama dihapus bila tidak lagi
     * dipakai baris lain.
     */
    public function replacePhoto(User $user, VillageOrgPosition $position, int $id, UploadedFile $photo): VillageOrgMember
    {
        $member = $this->findForPosition($user, $position, $id);

        $oldPath = $member->photo_img;
        $newPath = $photo->store("org-member-photos/{$position->village_id}", 'public');

        try {
            $member = $this->repository->update($member, ['photo_img' => $newPath]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($newPath);
            throw $exception;
        }

        $this->deletePhotoFile($oldPath, $member->id);

        return $member;
    }

    public function deletePhoto(User $user, VillageOrgPosition $position, int $id): VillageOrgMember
    {
        $member = $this->findForPosition($user, $position, $id);

        $oldPath = $member->photo_img;
        $member = $this->repository->update($member, ['photo_img' => null]);
        $this->deletePhotoFile($oldPath, $member->id);

        return $member;
    }

    private function findForPosition(User $user, VillageOrgPosition $position, int $id): VillageOrgMember
    {
        $this->guardBelongsToVillage($user, $position);

        $member = $this->repository->findByIdOrFail($id);
        $this->guardBelongsToPosition($member, $position);

        return $member;
    }

    private function deletePhotoFile(?string $path, int $memberId): void
    {
        if ($path && ! $this->repository->photoUsedByOthers($path, $memberId)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function resolvePromotionSource(VillageOrgPosition $position, int $memberId): VillageOrgMember
    {
        $source = $this->repository->findByIdOrFail($memberId)->loadMissing('position');
        $sourcePosition = $source->position;

        $sameOrganization = $sourcePosition->village_id === $position->village_id
            && $sourcePosition->org_type === $position->org_type;

        if (! $sameOrganization || $sourcePosition->id === $position->id || ! $source->is_active) {
            throw new HttpException(
                422,
                'Anggota yang dipilih harus anggota aktif organisasi ini dari jabatan lain.'
            );
        }

        return $source;
    }

    private function createMemberFrom(VillageOrgPosition $position, VillageOrgMember $from, string $startedAt): VillageOrgMember
    {
        $anggota = $this->positionRepository->findSlot($position->village_id, $position->org_type, 'anggota');

        return $this->repository->create([
            'position_id' => $anggota->id,
            'member_name' => $from->member_name,
            'photo_img' => $from->photo_img,
            'phone_wa' => $from->phone_wa,
            'started_at' => $startedAt,
            'ended_at' => null,
            'is_active' => true,
            'notes' => null,
        ]);
    }

    private function guardBelongsToVillage(User $user, VillageOrgPosition $position): void
    {
        if ($position->village_id !== $user->village_id) {
            throw new HttpException(404, 'Jabatan organisasi tidak ditemukan.');
        }
    }

    private function guardBelongsToPosition(VillageOrgMember $member, VillageOrgPosition $position): void
    {
        if (! $this->repository->belongsToPosition($member, $position)) {
            throw new HttpException(404, 'Anggota organisasi tidak ditemukan pada jabatan ini.');
        }
    }

    private function guardFeatureEnabled(VillageOrgPosition $position): void
    {
        if (! $position->is_active) {
            throw new HttpException(
                403,
                'Fitur rotasi untuk organisasi ini belum diaktifkan, menunggu konfirmasi desa.'
            );
        }
    }
}
