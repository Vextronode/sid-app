<?php

namespace Tests\Feature\Middleware;

use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class PasswordChangeMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_with_temporary_password_is_limited_to_allowed_routes(): void
    {
        $user = User::factory()->mustChangePassword()->create();

        $this->actingAs($user)
            ->getJson('/api/letters')
            ->assertForbidden()
            ->assertExactJson([
                'message' => 'Anda harus mengganti password terlebih dahulu.',
                'code' => 'password_change_required',
            ]);

        $this->actingAs($user)->getJson('/api/user')->assertOk();

        $this->actingAs($user)->putJson('/api/profile/password', [
            'current_password' => 'Password123',
            'password' => 'RahasiaAman123!',
            'password_confirmation' => 'RahasiaAman123!',
        ])->assertOk();

        $this->assertFalse($user->fresh()->must_change_password);
    }

    public function test_logout_remains_available_while_password_change_is_required(): void
    {
        $user = User::factory()->mustChangePassword()->create();
        $request = Request::create('/api/logout', 'POST');
        $request->setUserResolver(fn () => $user);

        $response = (new EnsurePasswordIsChanged)->handle(
            $request,
            fn () => response('middleware-passed'),
        );

        $this->assertSame('middleware-passed', $response->getContent());
    }
}
