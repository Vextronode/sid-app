<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLetterRequest;
use App\Services\LetterService;
use App\Models\Letter;
use App\Models\LetterType;

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
            'data' => $letter
        ], 201);
    }
    public function index()
    {
        $user = auth()->user();

        $letters = Letter::with([
            'letterType:id,name',
        ])
        ->where('submitted_by', $user->id)
        ->latest()
        ->get();

        return response()->json([
            'message' => 'Daftar permohonan surat berhasil diambil.',
            'data' => $letters
        ]);
    }

    public function show($id)
    {
        $user = auth()->user();


        $letter = Letter::with([
            'letterType:id,name',
            'approvals.approvedBy:id,name',
        ])
        ->where('submitted_by', $user->id)
        ->findOrFail($id);


        return response()->json([
            'message' => 'Detail permohonan berhasil diambil.',
            'data' => $letter
        ]);
    }
}