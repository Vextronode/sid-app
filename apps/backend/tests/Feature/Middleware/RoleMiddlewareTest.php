<?php

namespace Tests\Feature\Middleware;

use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-6-S2 — Feature test end-to-end untuk middleware RBAC `role`,
 * dijalankan lewat route ASLI di routes/api.php (bukan route buatan),
 * supaya sekaligus menjadi regression guard bagi konfigurasi RBAC
 * keseluruhan.
 *
 * Skenario ini fokus pada ROLE CHECK saja — bukan context check.
 * Context check (RT wilayah, current_step_order surat, dst) sudah
 * dites terpisah di *ApprovalServiceTest / *ApprovalControllerTest
 * yang sudah ada sebelumnya di project ini dan tidak disentuh oleh
 * task ini.
 *
 * Untuk skenario "boleh akses" (200), sebagian endpoint butuh record
 * `Official` aktif agar tidak berhenti di 404 milik context-check
 * Service (bukan kesalahan middleware) — fixture minimal disediakan
 * lewat helper officialForRole(). Untuk skenario "ditolak" (403),
 * TIDAK ada fixture domain sama sekali dibuat dengan sengaja: itu
 * justru membuktikan middleware menolak SEBELUM controller/Service
 * sempat berjalan.
 */
class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        return User::factory()->create(['role' => $role]);
    }

    /**
     * Buat user dengan role + record Official aktif yang sesuai, supaya
     * lolos context-check dasar (OfficialService::findActiveForUserOrFail)
     * dan benar-benar mencapai response 200 - bukti bahwa middleware
     * role TIDAK menghalangi role yang sah.
     */
    private function officialUser(string $role, string $position, array $officialAttrs = []): User
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => $role, 'village_id' => $village->id]);

        $official = Official::factory()->create(array_merge([
            'position' => $position,
            'village_id' => $village->id,
            'is_active' => true,
        ], $officialAttrs));

        $user->official()->save($official);

        return $user->fresh();
    }

    #[Test]
    public function guest_gets_401_on_any_protected_route(): void
    {
        $this->getJson('/api/rt/letters')->assertUnauthorized();
        $this->getJson('/api/kades/letters')->assertUnauthorized();
        $this->getJson('/api/citizens')->assertUnauthorized();
    }

    /*
    |--------------------------------------------------------------------------
    | RT approval endpoints — hanya role 'rt'
    |--------------------------------------------------------------------------
    */

    #[Test]
    public function rt_can_access_rt_letters_index(): void
    {
        $rw = Rw::factory()->create();
        $rt = Rt::factory()->create(['rw_id' => $rw->id]);
        $user = $this->officialUser('rt', 'rt', ['rt_id' => $rt->id]);

        $this->actingAs($user)
            ->getJson('/api/rt/letters')
            ->assertStatus(200);
    }

    #[DataProvider('nonRtRoles')]
    #[Test]
    public function non_rt_roles_cannot_access_rt_letters_index(string $role): void
    {
        // Sengaja TANPA fixture Official — membuktikan middleware
        // menolak di depan, sebelum Service butuh data apa pun.
        $user = $this->userWithRole($role);

        $this->actingAs($user)
            ->getJson('/api/rt/letters')
            ->assertForbidden()
            ->assertJson(['message' => 'Anda tidak memiliki akses untuk aksi ini.']);
    }

    public static function nonRtRoles(): array
    {
        return [
            ['warga'], ['rw'], ['kadus'], ['kasi_pelayanan'],
            ['kaur_tu_umum'], ['petugas_desa'], ['kepala_desa'], ['sekretaris_desa'],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Kades/Sekdes approval endpoints — hanya kepala_desa & sekretaris_desa
    |--------------------------------------------------------------------------
    */

    #[Test]
    public function kepala_desa_can_access_kades_letters_index(): void
    {
        $user = $this->officialUser('kepala_desa', 'kepala_desa');

        $this->actingAs($user)
            ->getJson('/api/kades/letters')
            ->assertStatus(200);
    }

    #[Test]
    public function sekretaris_desa_can_access_kades_letters_index(): void
    {
        $user = $this->officialUser('sekretaris_desa', 'sekdes');

        $this->actingAs($user)
            ->getJson('/api/kades/letters')
            ->assertStatus(200);
    }

    #[DataProvider('nonKadesRoles')]
    #[Test]
    public function non_kades_roles_cannot_access_kades_letters_index(string $role): void
    {
        $user = $this->userWithRole($role);

        $this->actingAs($user)
            ->getJson('/api/kades/letters')
            ->assertForbidden();
    }

    public static function nonKadesRoles(): array
    {
        return [
            ['warga'], ['rt'], ['rw'], ['kadus'],
            ['kasi_pelayanan'], ['kaur_tu_umum'], ['petugas_desa'],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Kasi/Kaur approval endpoints — hanya kasi_pelayanan & kaur_tu_umum
    |--------------------------------------------------------------------------
    */

    #[Test]
    public function kasi_pelayanan_can_access_kasi_letters_index(): void
    {
        $user = $this->officialUser('kasi_pelayanan', 'kasi_pelayanan');

        $this->actingAs($user)
            ->getJson('/api/kasi/letters')
            ->assertStatus(200);
    }

    #[Test]
    public function kaur_tu_umum_can_access_kasi_letters_index(): void
    {
        $user = $this->officialUser('kaur_tu_umum', 'kaur_tu_umum');

        $this->actingAs($user)
            ->getJson('/api/kasi/letters')
            ->assertStatus(200);
    }

    #[Test]
    public function rw_cannot_access_kasi_letters_index(): void
    {
        // Regression guard SID-ARCH-BE-001 S3.2: RW tidak pernah approver.
        $user = $this->userWithRole('rw');

        $this->actingAs($user)
            ->getJson('/api/kasi/letters')
            ->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | RW read-only FYI endpoint — hanya role 'rw'
    |--------------------------------------------------------------------------
    */

    #[Test]
    public function rw_can_access_own_fyi_letters_index(): void
    {
        $rw = Rw::factory()->create();
        $user = $this->officialUser('rw', 'rw', ['rw_id' => $rw->id]);

        $this->actingAs($user)
            ->getJson('/api/rw/letters')
            ->assertStatus(200);
    }

    #[Test]
    public function rt_cannot_access_rw_fyi_endpoint(): void
    {
        $user = $this->userWithRole('rt');

        $this->actingAs($user)
            ->getJson('/api/rw/letters')
            ->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | Letters store — hanya role 'warga' (UC-03 self-service)
    |--------------------------------------------------------------------------
    */

    #[DataProvider('nonWargaRoles')]
    #[Test]
    public function non_warga_roles_cannot_submit_letter(string $role): void
    {
        $user = $this->userWithRole($role);

        $this->actingAs($user)
            ->postJson('/api/letters', [])
            ->assertForbidden();
    }

    public static function nonWargaRoles(): array
    {
        return [
            ['rt'], ['rw'], ['kadus'], ['kasi_pelayanan'],
            ['kaur_tu_umum'], ['petugas_desa'], ['kepala_desa'], ['sekretaris_desa'],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Letters index — lintas-role (tidak boleh 403 middleware untuk role
    | manapun kecuali kadus, yang ditolak di LetterService bukan middleware)
    |--------------------------------------------------------------------------
    */

    #[DataProvider('rolesAllowedOnLetterIndex')]
    #[Test]
    public function every_non_kadus_role_is_not_blocked_by_middleware_on_letters_index(string $role): void
    {
        $user = $this->userWithRole($role);

        // Grup ini sengaja tanpa 'role:' guard di routes/api.php - status
        // akhir ditentukan LetterService berdasarkan scoping per role,
        // bukan middleware. Yang diverifikasi: middleware TIDAK memotong
        // request dengan 403 generik untuk role yang sah.
        $response = $this->actingAs($user)->getJson('/api/letters');

        $this->assertNotSame(403, $response->getStatusCode());
    }

    public static function rolesAllowedOnLetterIndex(): array
    {
        return [
            ['warga'], ['rt'], ['rw'], ['kasi_pelayanan'],
            ['kaur_tu_umum'], ['petugas_desa'], ['kepala_desa'], ['sekretaris_desa'],
        ];
    }

    #[Test]
    public function kadus_reaches_letter_service_and_is_rejected_there_not_by_middleware(): void
    {
        // LetterService::getScopedLetters() punya default => abort(403)
        // untuk role yang tidak match manapun (termasuk kadus). Middleware
        // TIDAK memasang guard di grup ini, jadi 403 yang terjadi berasal
        // dari Service, bukan middleware - konsisten dengan Kadus dihapus
        // total dari domain approval (SID-ARCH-BE-001 S3.2).
        $user = $this->userWithRole('kadus');

        $response = $this->actingAs($user)->getJson('/api/letters');

        $response->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | Domain konfigurasi/CMS eksklusif petugas_desa
    |--------------------------------------------------------------------------
    */

    #[Test]
    public function petugas_desa_can_access_citizens_index(): void
    {
        $user = $this->userWithRole('petugas_desa');

        $this->actingAs($user)->getJson('/api/citizens')->assertStatus(200);
    }

    #[DataProvider('nonPetugasDesaRoles')]
    #[Test]
    public function non_petugas_desa_roles_cannot_access_citizens_index(string $role): void
    {
        $user = $this->userWithRole($role);

        $this->actingAs($user)->getJson('/api/citizens')->assertForbidden();
    }

    public static function nonPetugasDesaRoles(): array
    {
        return [
            ['warga'], ['rt'], ['rw'], ['kadus'],
            ['kasi_pelayanan'], ['kaur_tu_umum'], ['kepala_desa'], ['sekretaris_desa'],
        ];
    }

    #[Test]
    public function kepala_desa_cannot_update_village_profile_even_though_approver_in_letters_domain(): void
    {
        // Regression guard SID-ARCH-SYS-001 S2.3: Kades adalah approver
        // aktif di domain Surat, tapi TIDAK punya akses domain CMS
        // (Profil Desa), yang eksklusif petugas_desa.
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => 'kepala_desa', 'village_id' => $village->id]);

        $this->actingAs($user)
            ->patchJson('/api/villages/profile', ['name' => 'Desa Cibenda Baru'])
            ->assertForbidden();
    }

    #[Test]
    public function petugas_desa_can_update_village_profile(): void
    {
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => 'petugas_desa', 'village_id' => $village->id]);

        $this->actingAs($user)
            ->patchJson('/api/villages/profile', [
                'name' => 'Desa Cibenda Baru',
                'head_name' => 'H. Ridwan Saepudin',
            ])
            ->assertStatus(200);
    }

    #[Test]
    public function any_authenticated_role_can_view_village_profile(): void
    {
        // show() lintas-role, hanya update() yang dibatasi petugas_desa.
        $village = Village::factory()->create();
        $user = User::factory()->create(['role' => 'warga', 'village_id' => $village->id]);

        $this->actingAs($user)
            ->getJson('/api/villages/profile')
            ->assertStatus(200);
    }

    #[Test]
    public function petugas_desa_cannot_access_rt_only_approval_route(): void
    {
        // Arah sebaliknya: petugas_desa (Tier 2 sama seperti Kades/Sekdes
        // di label navigasi) tetap TIDAK termasuk approver RT.
        $user = $this->userWithRole('petugas_desa');

        $this->actingAs($user)
            ->getJson('/api/rt/letters')
            ->assertForbidden();
    }

    /*
    |--------------------------------------------------------------------------
    | Notifications — lintas-role, tidak boleh 403 middleware
    |--------------------------------------------------------------------------
    */

    #[DataProvider('allNineRoles')]
    #[Test]
    public function every_role_can_reach_notifications_index_without_middleware_403(string $role): void
    {
        $user = $this->userWithRole($role);

        $response = $this->actingAs($user)->getJson('/api/notifications');

        $this->assertNotSame(403, $response->getStatusCode());
    }

    public static function allNineRoles(): array
    {
        return [
            ['warga'], ['rt'], ['rw'], ['kadus'], ['kasi_pelayanan'],
            ['kaur_tu_umum'], ['petugas_desa'], ['kepala_desa'], ['sekretaris_desa'],
        ];
    }
}
