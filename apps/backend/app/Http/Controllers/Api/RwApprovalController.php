<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LetterCollection;
use App\Http\Resources\LetterResource;
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
            'data' => new LetterCollection($letters),
        ]);
    }

    /**
     * ============================================================
     * Detail surat yang sedang berjalan di wilayah RW (read-only)
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
            'data' => new LetterResource($detail),
        ]);
    }
}
