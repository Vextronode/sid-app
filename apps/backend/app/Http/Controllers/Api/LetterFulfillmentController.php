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

    /**
     * Daftar perubahan (lama -> baru) yang akan disimpan Terapkan dengan
     * nilai yang sama, untuk dikonfirmasi lebih dulu. Tidak menyimpan apa pun.
     */
    public function preview(ApplyLetterFulfillmentRequest $request, Letter $letter)
    {
        $this->authorize('fulfill', $letter);

        return response()->json([
            'message' => 'Pratinjau perubahan data berhasil dihitung.',
            'data' => $this->letterFulfillmentService->preview(
                $letter,
                $request->user(),
                $request->validated('values') ?? [],
                $request->validated('subject_nik'),
                $request->validated('notes'),
            ),
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
