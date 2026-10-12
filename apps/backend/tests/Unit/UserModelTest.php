<?php

namespace Tests\Unit;

use App\Models\Official;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function username_is_trimmed_and_lowercased(): void
    {
        $user = new User;
        $user->username = '  SITI.Aminah  ';

        $this->assertSame('siti.aminah', $user->username);
    }

    #[Test]
    public function official_relation_returns_only_active_official_and_officials_returns_history(): void
    {
        $user = User::query()->create([
            'name' => 'Warga Uji',
            'username' => 'WARGA.UJI',
            'password' => 'Password123',
            'is_active' => true,
        ]);

        $inactive = Official::factory()->create([
            'user_id' => $user->id,
            'is_active' => false,
        ]);
        $active = Official::factory()->create([
            'user_id' => $user->id,
            'is_active' => true,
        ]);

        $this->assertSame($active->id, $user->official->id);
        $this->assertCount(2, $user->officials);
        $this->assertEqualsCanonicalizing(
            [$active->id, $inactive->id],
            $user->officials->modelKeys(),
        );
    }

    #[Test]
    public function active_and_password_change_flags_are_cast_to_boolean(): void
    {
        $user = User::query()->create([
            'name' => 'Warga Uji',
            'username' => 'warga.uji',
            'password' => 'Password123',
            'is_active' => 1,
            'must_change_password' => 1,
        ])->fresh();

        $this->assertIsBool($user->is_active);
        $this->assertTrue($user->is_active);
        $this->assertIsBool($user->must_change_password);
        $this->assertTrue($user->must_change_password);
    }
}
