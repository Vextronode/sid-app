<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LetterIndexRequest;
use App\Http\Requests\StoreLetterRequest;
use App\Models\Letter;
use App\Services\LetterService;

class LetterController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {}

    public function store(StoreLetterRequest $request)
    {
        $letter = $this->letterService
            ->createLetter($request->validated());

        return response()->json([
            'message' => 'Permohonan berhasil dibuat.',
            'data' => $letter,
        ], 201);
    }

    public function index(LetterIndexRequest $request)
    {
        $letters = $this->letterService->getScopedLetters(
            auth()->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Daftar surat berhasil diambil.',
            'data' => $letters,
        ]);
    }

    public function show($id)
    {
        $user = auth()->user();

       $letter = Letter::with([
        'letterType:id,name',
        'approvals.approvedBy:id,name',
    ])
    ->findOrFail($id);

        return response()->json([
            'message' => 'Detail permohonan berhasil diambil.',
            'data' => $letter,
        ]);
    }
}