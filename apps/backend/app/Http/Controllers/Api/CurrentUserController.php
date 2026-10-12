<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\Request;

class CurrentUserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    public function show(Request $request)
    {
        $user = $this->userService->getCurrentUserProfile($request->user());

        return new UserResource($user);
    }
}
