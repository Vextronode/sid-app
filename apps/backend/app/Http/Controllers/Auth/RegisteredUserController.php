<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Http\Resources\RegisteredUserResource;
use App\Services\Auth\AuthService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;

class RegisteredUserController extends Controller
{
    public function __construct(
        protected AuthService $authService,
    ) {}

    public function store(RegisterUserRequest $request): JsonResponse
    {
        $user = $this->authService->registerWarga($request->safe()->except('photo'), $request->file('photo'));

        event(new Registered($user));

        return (new RegisteredUserResource($user))
            ->additional(['message' => 'Pendaftaran terkirim. Akun aktif setelah disetujui petugas wilayah. Simpan username Anda.'])
            ->response()
            ->setStatusCode(201);
    }
}
