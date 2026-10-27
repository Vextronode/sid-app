<?php

namespace Tests\Feature;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\Hamlet;
use App\Models\News;
use App\Models\Official;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\User;
use App\Models\Village;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\Support\DemoData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Seeder demo Desa Cibenda: perangkat desa asli dengan foto, 5 dusun x 5 RW
 * x 5 RT, 100 warga, 10 berita, dan 5 akun demo yang melekat ke jabatan.
 */
class DemoDataSeederTest extends TestCase
{
    use RefreshDatabase;

    private const VILLAGE_POSITIONS = [
        'kepala_desa', 'sekretaris_desa', 'kasi_pelayanan', 'kasi_kesejahteraan', 'kasi_pemerintahan',
        'kaur_perencanaan', 'kaur_keuangan', 'kaur_tu_umum', 'staf_siskeudes', 'staf_sipades',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(DatabaseSeeder::class);
    }

    #[Test]
    public function it_seeds_the_village_profile_and_region_structure(): void
    {
        $village = Village::query()->sole();

        $this->assertSame('Dede Rusliana', $village->head_name);
        $this->assertStringStartsWith('Optimalisasi pemberdayaan', $village->vision);
        $this->assertCount(5, explode("\n", $village->mission));
        $this->assertNotEmpty($village->history);

        $this->assertSame(
            ['Patrol', 'Sinargalih', 'Cibenda', 'Budiasih', 'Sucen'],
            Hamlet::query()->orderBy('code')->pluck('name')->all(),
        );
        $this->assertSame(25, Rw::query()->count());
        $this->assertSame(125, Rt::query()->count());
    }

    #[Test]
    public function village_officials_and_hamlet_heads_have_photos(): void
    {
        $officials = Official::query()
            ->whereIn('position', [...self::VILLAGE_POSITIONS, 'kadus'])
            ->get();

        $this->assertCount(15, $officials);
        foreach ($officials as $official) {
            $this->assertNotNull($official->photo_img);
            Storage::disk('public')->assertExists($official->photo_img);
        }

        $this->assertSame(5, $officials->where('position', 'kadus')->pluck('hamlet_id')->unique()->count());
    }

    #[Test]
    public function every_rt_and_rw_has_one_chair_with_an_account_and_no_photo(): void
    {
        foreach (['rt' => 125, 'rw' => 25] as $position => $expected) {
            $chairs = Official::query()->where('position', $position)->get();

            $this->assertCount($expected, $chairs);
            $this->assertSame($expected, $chairs->pluck("{$position}_id")->unique()->count());
            $this->assertTrue($chairs->every(fn (Official $official) => $official->photo_img === null));
            $this->assertTrue($chairs->every(fn (Official $official) => $official->user_id !== null));
        }
    }

    #[Test]
    public function it_seeds_one_hundred_citizens_in_families(): void
    {
        $citizens = Citizen::query()->whereNotNull('family_id')->get();

        $this->assertCount(100, $citizens);
        $this->assertSame(0, Official::query()->whereIn('citizen_id', $citizens->pluck('id'))->count());
        $this->assertSame(
            Family::query()->count(),
            $citizens->where('family_role.value', 'kepala_keluarga')->count(),
        );
    }

    #[Test]
    public function it_seeds_ten_published_news_with_thumbnail_and_categories(): void
    {
        $news = News::query()->with('categories')->get();

        $this->assertCount(10, $news);
        foreach ($news as $item) {
            $this->assertTrue($item->is_published);
            Storage::disk('public')->assertExists($item->thumbnail);
            $this->assertContains($item->categories->count(), [1, 2]);
        }
    }

    #[Test]
    public function the_demo_accounts_log_in_with_the_demo_password(): void
    {
        $expectedRoles = [
            'demo_admin' => 'staf_sid',
            'demo_warga' => 'warga',
            'demo_warga2' => 'warga',
            'demo_warga3' => 'warga',
            'demo_kadus' => 'kadus',
            'demo_rw' => 'rw',
            'demo_rt' => 'rt',
        ];

        foreach ($expectedRoles as $username => $role) {
            $user = User::query()->where('username', $username)->sole();
            $this->assertSame($role, $user->role);
            $this->assertTrue(Hash::check(DemoData::DEMO_PASSWORD, $user->password));
        }

        $this->assertSame(0, User::query()->whereIn('username', ['demo_kasi', 'demo_kaur', 'demo_kades', 'demo_sekdes'])->count());

        // Istri dan anak kepala keluarga demo satu KK dengan demo_warga.
        $family = fn (string $username) => User::query()->where('username', $username)->sole()->citizen;
        $this->assertSame($family('demo_warga')->family_id, $family('demo_warga2')->family_id);
        $this->assertSame($family('demo_warga')->family_id, $family('demo_warga3')->family_id);
        $this->assertSame('istri', $family('demo_warga2')->family_role->value);
        $this->assertSame('anak', $family('demo_warga3')->family_role->value);

        $kadus = Official::query()->where('user_id', User::query()->where('username', 'demo_kadus')->value('id'))->sole();
        $this->assertSame('Aditulloh', $kadus->citizen()->value('name'));
        $this->assertSame('Patrol', Hamlet::query()->whereKey($kadus->hamlet_id)->value('name'));
    }

    #[Test]
    public function seeding_again_does_not_duplicate_data(): void
    {
        $counts = fn () => [
            Citizen::query()->count(),
            Family::query()->count(),
            User::query()->count(),
            Official::query()->count(),
            News::query()->count(),
        ];

        $before = $counts();
        $this->seed(DatabaseSeeder::class);

        $this->assertSame($before, $counts());
    }
}
