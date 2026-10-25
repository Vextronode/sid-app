<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApplyLetterFulfillmentRequest;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\LetterFulfillmentService;

class LetterFulfillmentController extends Controller
{
    public function __construct(
        protected LetterFulfillmentService $letterFulfillmentService
    ) {}

    public function show(Letter $letter)
    {
        $this->authorize('fulfill', $letter);

        return response()->json([
            'message' => 'Usulan perubahan data berhasil diambil.',
            'data' => $this->letterFulfillmentService->proposal($letter),
        ]);
    }

    public function store(ApplyLetterFulfillmentRequest $request, Letter $letter)
    {
        $this->authorize('fulfill', $letter);

        $letter = $this->letterFulfillmentService->apply(
            $letter,
            $request->user(),
            $request->validated('values') ?? [],
            $request->validated('subject_nik'),
            $request->validated('notes'),
        );

        return response()->json([
            'message' => 'Perubahan data berhasil diterapkan.',
            'data' => new LetterResource($letter),
        ]);
    }
}
