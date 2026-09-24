<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserCollection;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;

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

    public function store(StoreUserRequest $request)
    {
        $user = $this->userService->create($request->validated(), $request->user());

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $user = $this->userService->update($user, $request->validated(), $request->user());

        return (new UserResource($user))->response()->setStatusCode(200);
    }

    public function updateStatus(User $user)
    {
        $user = $this->userService->toggleActive($user);

        return response()->json([
            'message' => 'Status user berhasil diperbarui',
            'data' => new UserResource($user),
        ]);
    }
}
