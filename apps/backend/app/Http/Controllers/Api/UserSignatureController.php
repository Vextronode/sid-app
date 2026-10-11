<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResetUserSignatureRequest;
use App\Http\Requests\StoreUserSignatureRequest;
use App\Models\User;
use App\Services\UserSignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserSignatureController extends Controller
{
    public function __construct(
        protected UserSignatureService $userSignatureService
    ) {}

    public function show(Request $request): JsonResponse
    {
        $signature = $this->userSignatureService->active($request->user());

        return response()->json([
            'data' => [
                'has_signature' => $signature !== null,
                'created_at' => $signature?->created_at,
            ],
        ]);
    }

    public function store(StoreUserSignatureRequest $request): JsonResponse
    {
        $signature = $this->userSignatureService->create(
            $request->user(),
            $request->file('signature'),
        );

        return response()->json([
            'message' => 'Tanda tangan berhasil disimpan.',
            'data' => [
                'has_signature' => true,
                'created_at' => $signature->created_at,
            ],
        ], 201);
    }

    public function image(Request $request)
    {
        $signature = $this->userSignatureService->active($request->user());

        if ($signature === null) {
            abort(404, 'Anda belum memiliki tanda tangan.');
        }

        return $this->userSignatureService->imageResponse($signature);
    }

    public function reset(ResetUserSignatureRequest $request, User $user): JsonResponse
    {
        $this->userSignatureService->reset($request->user(), $user, $request->validated('reason'));

        return response()->json([
            'message' => 'Tanda tangan akun berhasil direset.',
        ]);
    }
}
