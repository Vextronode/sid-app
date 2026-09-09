<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LetterTypeCollection;
use App\Services\LetterTypeService;

class LetterTypeController extends Controller
{
    public function __construct(
        protected LetterTypeService $letterTypeService
    ) {}

    public function index()
    {
        $letterTypes = $this->letterTypeService->getActiveWithTemplate();

        return response()->json([
            'message' => 'Daftar jenis surat berhasil diambil.',
            'data' => new LetterTypeCollection($letterTypes),
        ]);
    }
}
