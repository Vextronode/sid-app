<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LetterType;

class LetterTypeController extends Controller
{
    public function index()
    {
        $letterTypes = LetterType::query()
            ->whereNotNull('template')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json([
            'message' => 'Daftar jenis surat berhasil diambil.',
            'data' => $letterTypes,
        ]);
    }
}
