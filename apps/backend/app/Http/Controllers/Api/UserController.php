<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserCollection;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    public function index()
    {
        $users = $this->userService->getAllWithCitizenAndOfficial();

        return (new UserCollection($users))->response()->setStatusCode(200);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $user = $this->userService->update($user, $request->validated(), $request->user());

        return (new UserResource($user))->response()->setStatusCode(200);
    }

    public function updateStatus(Request $request, User $user)
    {
        $user = $this->userService->toggleActive($user, $request->user());

        return response()->json([
            'message' => 'Status user berhasil diperbarui',
            'data' => new UserResource($user),
        ]);
    }

    public function resetPassword(Request $request, User $user)
    {
        $temporaryPassword = $this->userService->resetPassword($user, $request->user());

        return response()->json([
            'message' => 'Kata sandi sementara berhasil dibuat. Berikan kepada pengguna secara aman.',
            'temporary_password' => $temporaryPassword,
        ]);
    }
}
