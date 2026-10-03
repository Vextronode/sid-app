<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Services\Auth\AuthService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RegisteredUserController extends Controller
{
    public function __construct(
        protected AuthService $authService,
    ) {}

    public function store(RegisterUserRequest $request): JsonResponse
    {
        $user = $this->authService->registerWarga($request->validated());

        event(new Registered($user));

        Auth::login($user);

        return response()->json([
            'message' => 'Akun berhasil dibuat. Simpan username Anda.',
            'data' => [
                'username' => $user->username,
                'name' => $user->name,
            ],
        ], 201);
    }
}
