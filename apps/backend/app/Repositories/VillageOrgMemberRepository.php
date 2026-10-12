<?php

namespace App\Repositories;

use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use Illuminate\Database\Eloquent\Collection;

class VillageOrgMemberRepository
{
    public function __construct()
    {
        //
    }

    public function activeForPosition(int $positionId): Collection
    {
        return VillageOrgMember::query()
            ->where('position_id', $positionId)
            ->where('is_active', true)
            ->whereNull('ended_at')
            ->get();
    }

    public function findByIdOrFail(int $id): VillageOrgMember
    {
        return VillageOrgMember::query()->findOrFail($id);
    }

    public function create(array $data): VillageOrgMember
    {
        return VillageOrgMember::create($data);
    }

    /**
     * Mengakhiri masa jabatan anggota lama (dipakai saat rotasi otomatis
     * untuk jabatan is_single_occupant=true): set ended_at + is_active=false.
     * Tidak menghapus row — riwayat pemegang jabatan tetap tersimpan.
     */
    public function endMembership(VillageOrgMember $member, string $endedAt): VillageOrgMember
    {
        $member->update([
            'ended_at' => $endedAt,
            'is_active' => false,
        ]);

        return $member;
    }

    public function update(VillageOrgMember $member, array $data): VillageOrgMember
    {
        $member->update($data);

        return $member;
    }

    public function delete(VillageOrgMember $member): void
    {
        $member->delete();
    }

    public function belongsToPosition(VillageOrgMember $member, VillageOrgPosition $position): bool
    {
        return $member->position_id === $position->id;
    }
}
