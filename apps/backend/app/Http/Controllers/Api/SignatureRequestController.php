<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptSignatureRequestRequest;
use App\Http\Requests\RejectSignatureRequestRequest;
use App\Http\Resources\SignatureRequestResource;
use App\Models\LetterSignature;
use App\Models\SignatureBlock;
use App\Services\LetterService;
use App\Services\LetterSignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sisi pemilik NIK: melihat permintaan tanda tangan yang ditujukan
 * kepadanya, lalu menyetujui atau menolak per surat.
 */
class SignatureRequestController extends Controller
{
    public function __construct(
        protected LetterSignatureService $letterSignatureService,
        protected LetterService $letterService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => SignatureRequestResource::collection(
                $this->letterSignatureService->pendingFor($request->user())
            ),
        ]);
    }

    public function accept(AcceptSignatureRequestRequest $request, LetterSignature $signatureRequest): JsonResponse
    {
        $signed = $this->letterSignatureService->accept($signatureRequest, $request->user());
        $this->letterService->beginApprovalIfSigned($signed->letter, $request->user());

        return response()->json([
            'message' => 'Permintaan saksi disetujui.',
        ]);
    }

    public function reject(RejectSignatureRequestRequest $request, LetterSignature $signatureRequest): JsonResponse
    {
        $this->letterSignatureService->reject(
            $signatureRequest,
            $request->user(),
            $request->validated('notes'),
            (bool) $request->validated('block', false),
        );

        return response()->json([
            'message' => 'Permintaan saksi ditolak.',
        ]);
    }

    public function blocks(Request $request): JsonResponse
    {
        $blocks = SignatureBlock::query()
            ->where('user_id', $request->user()->id)
            ->with('blockedUser.citizen')
            ->latest('id')
            ->get();

        return response()->json([
            'data' => $blocks->map(fn (SignatureBlock $block): array => $this->blockData($block)),
        ]);
    }

    /**
     * Memblokir warga berdasarkan NIK: permintaan TTD/saksi darinya tidak
     * lagi sampai ke akun ini.
     */
    public function block(Request $request): JsonResponse
    {
        $nik = (string) $request->validate(['nik' => ['required', 'digits:16']])['nik'];
        $block = $this->letterSignatureService->blockByNik($request->user(), $nik);

        return response()->json([
            'message' => 'Warga diblokir.',
            'data' => $this->blockData($block->load('blockedUser.citizen')),
        ], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function blockData(SignatureBlock $block): array
    {
        $nik = $block->blockedUser?->citizen?->nik;

        return [
            'id' => $block->id,
            'blocked_user_name' => $block->blockedUser?->name,
            'blocked_nik_masked' => $nik ? str_repeat('*', 12).substr($nik, -4) : null,
            'created_at' => $block->created_at,
        ];
    }

    public function unblock(Request $request, SignatureBlock $signatureBlock): JsonResponse
    {
        if ($signatureBlock->user_id !== $request->user()->id) {
            abort(404, 'Data blokir tidak ditemukan.');
        }

        $signatureBlock->delete();

        return response()->json([
            'message' => 'Blokir dicabut.',
        ]);
    }
}
