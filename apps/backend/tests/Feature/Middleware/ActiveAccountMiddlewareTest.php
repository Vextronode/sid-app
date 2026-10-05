<?php

namespace Tests\Feature\Middleware;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ActiveAccountMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_deactivated_account_cannot_keep_using_its_authenticated_session(): void
    {
        $user = User::factory()->create(['username' => 'aktif.1234']);

        $this->postJson('/login', [
            'username' => $user->username,
            'password' => 'Password123',
        ])->assertOk();

        DB::table('users')->where('id', $user->id)->update(['is_active' => false]);
        Auth::forgetGuards();

        $this->getJson('/api/user')
            ->assertForbidden()
            ->assertJson([
                'message' => 'Akun tidak aktif, hubungi administrator.',
                'code' => 'account_inactive',
            ]);

        // Akun nonaktif tetap boleh membersihkan sesi login yang tertinggal.
        $this->postJson('/api/logout')->assertOk();
    }

    public function test_deactivated_account_cannot_use_an_existing_sanctum_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('existing-session')->plainTextToken;

        $this->withToken($token)->getJson('/api/user')->assertOk();

        DB::table('users')->where('id', $user->id)->update(['is_active' => false]);
        Auth::forgetGuards();

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertForbidden()
            ->assertJsonPath('code', 'account_inactive');

        $this->postJson('/api/logout')->assertOk();
        $this->assertSame(0, $user->tokens()->count());
    }
}
