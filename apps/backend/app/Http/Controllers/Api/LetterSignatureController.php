<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefillLetterSignatureRequest;
use App\Http\Resources\LetterSignatureResource;
use App\Models\Letter;
use App\Services\LetterService;
use App\Services\LetterSignatureService;
use Illuminate\Http\JsonResponse;

/**
 * Sisi pemohon: mengisi ulang slot tanda tangan pihak lain pada surat
 * yang masih menunggu tanda tangan (ajukan ke NIK lain, atau unggah
 * dokumen ber-TTD basah).
 */
class LetterSignatureController extends Controller
{
    public function __construct(
        protected LetterSignatureService $letterSignatureService,
        protected LetterService $letterService,
    ) {}

    public function store(RefillLetterSignatureRequest $request, Letter $letter, string $slot): JsonResponse
    {
        $user = $request->user();

        if (! $letter->isSubmittedBy($user)) {
            abort(403, 'Hanya pemohon yang dapat mengatur tanda tangan surat ini.');
        }

        if (
            $letter->status->value !== 'pending'
            || $letter->current_step_order !== LetterService::AWAITING_SIGNATURES_STEP
        ) {
            abort(409, 'Surat ini tidak sedang menunggu tanda tangan.');
        }

        $signature = $this->letterSignatureService->refillSlot(
            $letter,
            $user,
            $slot,
            $request->safe()->only(['nik', 'name', 'family_number']),
            $request->file('file'),
        );

        $this->letterService->beginApprovalIfSigned($letter, $user);

        return response()->json([
            'message' => 'Tanda tangan untuk slot ini diperbarui.',
            'data' => new LetterSignatureResource($signature),
        ]);
    }
}
