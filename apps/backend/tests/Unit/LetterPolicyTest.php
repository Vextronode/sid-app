<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\User;
use App\Policies\LetterPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LetterPolicyTest extends TestCase
{
    use RefreshDatabase;

    private LetterPolicy $policy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->policy = new LetterPolicy;
    }

    public function test_view_any_allows_any_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->assertTrue($this->policy->viewAny($user));
    }

    public function test_create_allows_any_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'warga']);

        $this->assertTrue($this->policy->create($user));
    }

    public function test_view_allows_any_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create();

        $this->assertTrue($this->policy->view($user, $letter));
    }

    public function test_delete_allowed_for_owner(): void
    {
        $user = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $user->id]);

        $this->assertTrue($this->policy->delete($user, $letter));
    }

    #[DataProvider('staffRoleProvider')]
    public function test_delete_allowed_for_staff_roles(string $role): void
    {
        $owner = User::factory()->create();
        $staff = User::factory()->create(['role' => $role]);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertTrue($this->policy->delete($staff, $letter));
    }

    public static function staffRoleProvider(): array
    {
        return [
            ['kepala_desa'],
            ['sekretaris_desa'],
            ['kasi_pelayanan'],
            ['kaur_tu_umum'],
            ['petugas_desa'],
        ];
    }

    public function test_delete_forbidden_for_unrelated_warga(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create(['role' => 'warga']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertFalse($this->policy->delete($stranger, $letter));
    }

    public function test_delete_forbidden_for_unrelated_rt(): void
    {
        $owner = User::factory()->create();
        $rtUser = User::factory()->create(['role' => 'rt']);
        $letter = Letter::factory()->create(['submitted_by' => $owner->id]);

        $this->assertFalse($this->policy->delete($rtUser, $letter));
    }
}
