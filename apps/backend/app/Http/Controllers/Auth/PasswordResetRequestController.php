<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompletePasswordResetRequestRequest;
use App\Http\Requests\Auth\StorePasswordResetRequestRequest;
use App\Http\Resources\PasswordResetRequestStatusResource;
use App\Services\PasswordResetRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sisi pengaju (belum login) dari lupa kata sandi tanpa email: ajukan
 * permintaan, cek status dengan token klaim, lalu buat kata sandi baru
 * setelah disetujui Staf SIDUTama. Token dikirim di body (bukan URL)
 * supaya tidak tercatat di log akses.
 */
class PasswordResetRequestController extends Controller
{
    public function __construct(
        protected PasswordResetRequestService $resetRequestService
    ) {}

    public function store(StorePasswordResetRequestRequest $request): JsonResponse
    {
        $result = $this->resetRequestService->submit(
            $request->validated('nik'),
            $request->validated('date_of_birth'),
            $request->ip(),
        );

        return (new PasswordResetRequestStatusResource($result['request']->load('user:id,name,username')))
            ->additional([
                'message' => 'Permintaan terkirim. Harap cek kembali halaman ini setelah disetujui staf desa.',
                'token' => $result['token'],
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function status(Request $request): PasswordResetRequestStatusResource
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
        ]);

        return new PasswordResetRequestStatusResource(
            $this->resetRequestService->findByToken($validated['token'])
        );
    }

    public function complete(CompletePasswordResetRequestRequest $request): JsonResponse
    {
        $this->resetRequestService->complete(
            $request->validated('token'),
            $request->validated('password'),
        );

        return response()->json([
            'message' => 'Kata sandi berhasil dibuat. Silakan login dengan kata sandi baru.',
        ]);
    }
}
