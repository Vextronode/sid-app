<?php

namespace App\Services;

use App\Models\User;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Repositories\VillageOrgMemberRepository;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VillageOrgMemberService
{
    public function __construct(
        private readonly VillageOrgMemberRepository $repository,
    ) {}

    public function addOrRotate(User $user, VillageOrgPosition $position, array $data): VillageOrgMember
    {
        $this->guardBelongsToVillage($user, $position);
        $this->guardFeatureEnabled($position);

        return DB::transaction(function () use ($position, $data) {
            if ($position->is_single_occupant) {
                $activeMembers = $this->repository->activeForPosition($position->id);

                foreach ($activeMembers as $activeMember) {
                    $this->repository->endMembership($activeMember, $data['started_at']);
                }
            }

            return $this->repository->create([
                'position_id' => $position->id,
                'member_name' => $data['member_name'],
                'photo_img' => $data['photo_img'] ?? null,
                'phone_wa' => $data['phone_wa'] ?? null,
                'started_at' => $data['started_at'],
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

    public function delete(User $user, VillageOrgPosition $position, int $id): void
    {
        $this->guardBelongsToVillage($user, $position);

        $member = $this->repository->findByIdOrFail($id);
        $this->guardBelongsToPosition($member, $position);

        $this->repository->delete($member);
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
