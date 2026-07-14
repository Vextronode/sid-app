<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLetterRequest;
use App\Services\LetterService;

class LetterController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {
    }

    public function store(StoreLetterRequest $request)
    {
        $letter = $this->letterService
            ->createLetter($request->validated());

        return response()->json([
            'message' => 'Permohonan surat berhasil dibuat.',
            'data' => $letter,
        ], 201);
    }
}