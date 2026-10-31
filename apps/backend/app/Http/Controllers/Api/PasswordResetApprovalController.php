<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectPasswordResetRequestRequest;
use App\Http\Resources\PasswordResetRequestResource;
use App\Models\PasswordResetRequest;
use App\Services\PasswordResetRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Sisi Staf SIDUTama dari lupa kata sandi tanpa email: daftar permintaan
 * warga di desanya, lalu setujui atau tolak.
 */
class PasswordResetApprovalController extends Controller
{
    public function __construct(
        protected PasswordResetRequestService $resetRequestService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:pending,approved,rejected,completed,cancelled'],
        ]);
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return PasswordResetRequestResource::collection(
            $this->resetRequestService->forVillage($request->user(), $validated['status'] ?? null, $perPage)
        );
    }

    public function approve(Request $request, PasswordResetRequest $resetRequest): JsonResponse
    {
        $this->resetRequestService->approve($request->user(), $resetRequest);

        return response()->json([
            'message' => 'Permintaan disetujui. Pengaju dapat membuat kata sandi baru dalam '.PasswordResetRequest::APPROVAL_TTL_HOURS.' jam.',
        ]);
    }

    public function reject(RejectPasswordResetRequestRequest $request, PasswordResetRequest $resetRequest): JsonResponse
    {
        $this->resetRequestService->reject(
            $request->user(),
            $resetRequest,
            $request->validated('notes'),
        );

        return response()->json([
            'message' => 'Permintaan atur ulang kata sandi ditolak.',
        ]);
    }
}
