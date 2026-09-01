<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RwApprovalRequest;
use App\Models\Letter;
use App\Services\RwApprovalService;
use Illuminate\Http\Request;

class RwApprovalController extends Controller
{
    public function __construct(
        protected RwApprovalService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getPendingLetters(
            $request->user()
        );

        return response()->json([
            'message' => 'Daftar surat RW berhasil diambil.',
            'data' => $letters,
        ]);
    }

    public function approve(
        RwApprovalRequest $request,
        Letter $letter
    ) {
        $this->service->approve(
            $letter,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Surat berhasil diproses.',
        ]);
    }

    /**
     * ============================================================
     * Detail surat yang sedang diproses RW
     * ============================================================
     */
    public function show(
        Request $request,
        Letter $letter
    ) {
        $detail = $this->service->getLetterDetail(
            $letter,
            $request->user()
        );

        return response()->json([
            'message' => 'Detail surat berhasil diambil.',
            'data' => $detail,
        ]);
    }
}
