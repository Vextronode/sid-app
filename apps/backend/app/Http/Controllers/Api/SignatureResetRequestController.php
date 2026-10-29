<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectSignatureResetRequestRequest;
use App\Http\Requests\StoreSignatureResetRequestRequest;
use App\Http\Resources\SignatureResetRequestResource;
use App\Models\SignatureResetRequest;
use App\Services\SignatureResetRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Pengajuan reset tanda tangan: diajukan pemilik akun dari profil,
 * diputuskan Staf SIDUTama di halaman Pengajuan Reset.
 */
class SignatureResetRequestController extends Controller
{
    public function __construct(
        protected SignatureResetRequestService $resetRequestService
    ) {}

    public function store(StoreSignatureResetRequestRequest $request): JsonResponse
    {
        $resetRequest = $this->resetRequestService->submit(
            $request->user(),
            $request->validated('reason'),
        );

        return response()->json([
            'message' => 'Pengajuan reset tanda tangan terkirim.',
            'data' => [
                'id' => $resetRequest->id,
                'created_at' => $resetRequest->created_at,
            ],
        ], 201);
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return SignatureResetRequestResource::collection(
            $this->resetRequestService->forVillage($request->user(), $perPage)
        );
    }

    public function approve(Request $request, SignatureResetRequest $resetRequest): JsonResponse
    {
        $this->resetRequestService->approve($request->user(), $resetRequest);

        return response()->json([
            'message' => 'Pengajuan disetujui. Tanda tangan akun berhasil direset.',
        ]);
    }

    public function reject(RejectSignatureResetRequestRequest $request, SignatureResetRequest $resetRequest): JsonResponse
    {
        $this->resetRequestService->reject(
            $request->user(),
            $resetRequest,
            $request->validated('notes'),
        );

        return response()->json([
            'message' => 'Pengajuan reset tanda tangan ditolak.',
        ]);
    }
}
