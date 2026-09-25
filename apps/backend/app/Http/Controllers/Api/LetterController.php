<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LetterIndexRequest;
use App\Http\Requests\StoreLetterRequest;
use App\Http\Resources\LetterCollection;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\LetterService;
use Illuminate\Http\Request;

class LetterController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {}

    public function store(StoreLetterRequest $request)
    {
        $this->authorize('create', Letter::class);

        $letter = $this->letterService
            ->createLetter($request->validated());

        return response()->json([
            'message' => 'Permohonan berhasil dibuat.',
            'data' => new LetterResource($letter),
        ], 201);
    }

    public function index(LetterIndexRequest $request)
    {
        $this->authorize('viewAny', Letter::class);

        $letters = $this->letterService->getScopedLetters(
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Daftar surat berhasil diambil.',
            'data' => new LetterCollection($letters),
        ]);
    }

    public function show($id)
    {
        $letter = $this->letterService->getForShow((int) $id);

        $this->authorize('view', $letter);

        return response()->json([
            'message' => 'Detail surat berhasil diambil.',
            'data' => new LetterResource($letter),
        ]);
    }

    public function destroy(Request $request, Letter $letter) {
        $this->authorize('delete', $letter);

        $this->letterService->delete(
            $letter,
            $request->user()
        );

        return response()->json(['message' => 'Surat berhasil dihapus.']);
    }
}
