<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LetterCollection;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\KasiLetterService;
use Illuminate\Http\Request;

class KasiLetterController extends Controller
{
    public function __construct(
        protected KasiLetterService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getCompletedLetters(
            $request->user()
        );

        return response()->json([
            'message' => 'Daftar surat Kasi/Kaur berhasil diambil.',
            'data' => new LetterCollection($letters),
        ]);
    }

    public function show(
        Request $request,
        Letter $letter
    ) {
        $this->authorize('view', $letter);

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
