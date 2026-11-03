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
     * untuk jabatan is_single_occupant=true) atau keanggotaan: set ended_at +
     * is_active=false. Baris tidak pernah dihapus; riwayat tetap tersimpan.
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

    /**
     * Warga sedang aktif di salah satu jabatan organisasi yang sama (mis.
     * Anggota BPD tidak bisa sekaligus didaftarkan lagi di BPD).
     */
    public function citizenActiveInOrganization(string $citizenId, string $villageId, string $orgType): bool
    {
        return VillageOrgMember::query()
            ->where('citizen_id', $citizenId)
            ->where('is_active', true)
            ->whereHas('position', fn ($query) => $query->where('village_id', $villageId)->where('org_type', $orgType))
            ->exists();
    }

    /**
     * Promosi dan turun jabatan menyalin photo_img ke baris baru, jadi satu
     * berkas foto bisa dipakai beberapa baris (termasuk riwayat).
     */
    public function photoUsedByOthers(string $path, int $exceptMemberId): bool
    {
        return VillageOrgMember::query()
            ->where('photo_img', $path)
            ->whereKeyNot($exceptMemberId)
            ->exists();
    }

    public function belongsToPosition(VillageOrgMember $member, VillageOrgPosition $position): bool
    {
        return $member->position_id === $position->id;
    }
}
