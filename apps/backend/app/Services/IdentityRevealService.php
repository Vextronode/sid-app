<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

/**
 * Menampilkan NIK / No. KK utuh yang di daftar hanya tampil tersamar
 * (tombol "lihat" di UI). Yang boleh melihat:
 *  - Petugas Desa, Kasi Pemerintahan, Kaur TU & Umum: warga dan KK desanya;
 *  - warga: dirinya dan anggota KK-nya sendiri;
 *  - siapa pun yang boleh melihat sebuah surat: NIK pemohon surat itu.
 * Setiap pembukaan data orang lain dicatat di Log Aktivitas.
 */
class IdentityRevealService
{
    private const POPULATION_ROLES = [UserRole::StafSid, UserRole::KasiPemerintahan, UserRole::KaurTuUmum];

    /**
     * @return array{nik: string|null, no_kk: string|null}
     */
    public function citizen(User $actor, Citizen $citizen): array
    {
        $citizen->loadMissing('family:id,no_kk');
        $ownFamily = $actor->citizen !== null && (
            $actor->citizen->is($citizen)
            || ($actor->citizen->family_id !== null && $actor->citizen->family_id === $citizen->family_id)
        );

        if (! $ownFamily && ! $this->managesPopulation($actor, $citizen->village_id)) {
            abort(403, 'Anda tidak berhak melihat NIK warga ini.');
        }

        if (! $actor->citizen?->is($citizen)) {
            $this->log($actor, $citizen, $citizen->village_id, $citizen->name, 'NIK/No. KK warga');
        }

        return ['nik' => $citizen->nik, 'no_kk' => $citizen->family?->no_kk];
    }

    /**
     * @return array{no_kk: string|null}
     */
    public function family(User $actor, Family $family): array
    {
        $ownFamily = $actor->citizen?->family_id !== null && $actor->citizen->family_id === $family->id;

        if (! $ownFamily && ! $this->managesPopulation($actor, $family->village_id)) {
            abort(403, 'Anda tidak berhak melihat No. KK ini.');
        }

        if (! $ownFamily) {
            $this->log($actor, $family, $family->village_id, 'KK '.$family->id, 'No. KK');
        }

        return ['no_kk' => $family->no_kk];
    }

    /**
     * @return array{nik: string|null}
     */
    public function letterApplicant(User $actor, Letter $letter): array
    {
        Gate::forUser($actor)->authorize('view', $letter);

        if (! $letter->isSubmittedBy($actor)) {
            $this->log($actor, $letter, $letter->village_id, (string) $letter->applicant_name, 'NIK pemohon surat');
        }

        return ['nik' => $letter->applicant_nik];
    }

    private function managesPopulation(User $actor, ?string $villageId): bool
    {
        return $actor->is_active
            && $actor->village_id !== null
            && $actor->village_id === $villageId
            && in_array(UserRole::tryFrom((string) $actor->role), self::POPULATION_ROLES, true);
    }

    private function log(User $actor, object $subject, ?string $villageId, string $label, string $field): void
    {
        activity($subject instanceof Letter ? 'letter' : ($subject instanceof Family ? 'family' : 'citizen'))
            ->performedOn($subject)
            ->causedBy($actor)
            ->event('identity_viewed')
            ->withProperties([
                'village_id' => $villageId,
                'subject_label' => $label,
                'actor_role' => $actor->role,
                'field' => $field,
            ])
            ->log("Melihat {$field}");
    }
}
