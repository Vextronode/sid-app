<?php

namespace Tests\Feature;

use App\Models\AccountRegistration;
use App\Models\Citizen;
use App\Models\CitizenBusiness;
use App\Models\Letter;
use App\Models\MigrantWorker;
use App\Models\Official;
use App\Models\ProfilePhotoRequest;
use App\Models\User;
use App\Models\Village;
use App\Models\VillageOrgMember;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Hapus warga hanya untuk data salah input: warga yang sudah punya riwayat
 * ditolak 409 (ReferenceRepository) dan database juga menolaknya.
 */
class CitizenDeletionTest extends TestCase
{
    use RefreshDatabase;

    private const HINT = 'Hapus hanya untuk data salah input; warga yang meninggal atau pindah dinonaktifkan lewat surat (Terapkan).';

    private Village $village;

    private User $staf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->village = Village::factory()->create();
        $this->staf = User::factory()->create(['role' => 'staf_sid', 'village_id' => $this->village->id]);
    }

    /**
     * @return array<string, array{string, Closure(Citizen): mixed}>
     */
    public static function citizenHistory(): array
    {
        return [
            'akun login' => ['akun login', fn (Citizen $citizen) => User::factory()->create([
                'citizen_id' => $citizen->id, 'village_id' => $citizen->village_id,
            ])],
            'jabatan lama (tidak aktif)' => ['jabatan pejabat', fn (Citizen $citizen) => Official::factory()->create([
                'citizen_id' => $citizen->id, 'village_id' => $citizen->village_id, 'is_active' => false,
            ])],
            'pendaftaran akun' => ['pendaftaran akun', fn (Citizen $citizen) => AccountRegistration::query()->create([
                'village_id' => $citizen->village_id, 'citizen_id' => $citizen->id,
            ])],
            'surat sebagai pemohon' => ['surat', fn (Citizen $citizen) => Letter::factory()->create(['citizen_id' => $citizen->id])],
            'surat atas nama' => ['surat', fn (Citizen $citizen) => Letter::factory()->create(['on_behalf_of' => $citizen->id])],
            'data usaha' => ['data usaha', fn (Citizen $citizen) => CitizenBusiness::factory()->create(['citizen_id' => $citizen->id])],
            'data CPMI' => ['data CPMI', fn (Citizen $citizen) => MigrantWorker::factory()->create(['citizen_id' => $citizen->id])],
            'anggota lembaga desa' => ['anggota lembaga desa', fn (Citizen $citizen) => VillageOrgMember::factory()->create([
                'citizen_id' => $citizen->id,
            ])],
            'permintaan foto profil' => ['permintaan foto profil', fn (Citizen $citizen) => ProfilePhotoRequest::query()->create([
                'village_id' => $citizen->village_id,
                'user_id' => User::factory()->create(['village_id' => $citizen->village_id])->id,
                'citizen_id' => $citizen->id,
            ])],
        ];
    }

    #[DataProvider('citizenHistory')]
    public function test_citizen_with_history_cannot_be_deleted(string $label, Closure $refer): void
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id]);
        $refer($citizen);

        $this->actingAs($this->staf)
            ->deleteJson("/api/citizens/{$citizen->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', "Data warga tidak bisa dihapus karena sudah punya {$label}. ".self::HINT);

        $this->assertModelExists($citizen);
    }

    public function test_message_lists_every_kind_of_history(): void
    {
        $citizen = Citizen::factory()->create(['village_id' => $this->village->id]);
        User::factory()->create(['citizen_id' => $citizen->id, 'village_id' => $this->village->id]);
        Official::factory()->create(['citizen_id' => $citizen->id, 'village_id' => $this->village->id]);
        Letter::factory()->create(['citizen_id' => $citizen->id]);

        $this->actingAs($this->staf)
            ->deleteJson("/api/citizens/{$citizen->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Data warga tidak bisa dihapus karena sudah punya akun login, jabatan pejabat, dan surat. '.self::HINT);
    }

    public function test_citizen_without_history_is_deleted_and_parent_links_are_cleared(): void
    {
        $mistake = Citizen::factory()->create(['village_id' => $this->village->id]);
        // Hubungan ayah/ibu adalah data, bukan riwayat: tidak menghalangi.
        $child = Citizen::factory()->create(['village_id' => $this->village->id, 'father_id' => $mistake->id]);

        $this->actingAs($this->staf)
            ->deleteJson("/api/citizens/{$mistake->id}")
            ->assertOk();

        $this->assertModelMissing($mistake);
        $this->assertNull($child->fresh()->father_id);
    }
}
