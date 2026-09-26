<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LetterCollection;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\RwFyiService;
use Illuminate\Http\Request;

class RwFyiController extends Controller
{
    public function __construct(
        protected RwFyiService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getFyiLetters(
            $request->user()
        );

        return response()->json([
            'message' => 'Riwayat surat FYI RW berhasil diambil.',
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
        $this->authorize('view', $letter);

        $detail = $this->service->getFyiLetterDetail(
            $letter,
            $request->user()
        );

        return response()->json([
            'message' => 'Detail surat berhasil diambil.',
            'data' => new LetterResource($detail),
        ]);
    }
}
