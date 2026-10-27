<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewLetterResultRequest;
use App\Http\Requests\StoreLetterResultRequest;
use App\Http\Resources\LetterResultResource;
use App\Models\Letter;
use App\Models\LetterResult;
use App\Services\LetterResultService;

class LetterResultController extends Controller
{
    public function __construct(
        protected LetterResultService $letterResultService
    ) {}

    public function store(StoreLetterResultRequest $request, Letter $letter)
    {
        $this->authorize('uploadResult', $letter);

        $result = $this->letterResultService->submit(
            $letter,
            $request->user(),
            $request->file('files', []),
        );

        return response()->json([
            'message' => 'Hasil dari instansi berhasil diunggah dan menunggu verifikasi.',
            'data' => new LetterResultResource($result),
        ], 201);
    }

    public function update(ReviewLetterResultRequest $request, Letter $letter, LetterResult $result)
    {
        $this->authorize('reviewResult', $letter);

        $accepted = $request->validated('decision') === 'accepted';
        $result = $this->letterResultService->review(
            $letter,
            $result,
            $request->user(),
            $accepted,
            $request->validated('notes'),
        );

        return response()->json([
            'message' => $accepted ? 'Hasil dari instansi diterima.' : 'Hasil dari instansi ditolak.',
            'data' => new LetterResultResource($result),
        ]);
    }
}
