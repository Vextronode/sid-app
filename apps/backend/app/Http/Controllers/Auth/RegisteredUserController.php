<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Services\Auth\AuthService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class RegisteredUserController extends Controller
{
    public function __construct(
        protected AuthService $authService,
    ) {}

    public function store(RegisterUserRequest $request): Response
    {
        $user = $this->authService->registerWarga($request->validated());

        event(new Registered($user));

        Auth::login($user);

        return response()->noContent();
    }
}
