<?php

namespace App\Http\Controllers\Api;

use App\Enums\LetterStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\LetterIndexRequest;
use App\Http\Requests\StoreLetterRequest;
use App\Models\Letter;
use App\Services\LetterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'letterType:id,name,code',
            'approvals.approvedBy:id,name',
        ])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Detail permohonan berhasil diambil.',
            'data' => $letter,
        ]);
    }

    public function destroy(Letter $letter)
    {
        $user = auth()->user();

        if ($letter->submitted_by !== $user->id && ! in_array($user->role, ['admin', 'operator', 'kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa'])) {
            abort(403, 'Anda tidak berwenang menghapus surat ini.');
        }

        $letter->delete();

        return response()->json([
            'message' => 'Surat berhasil dihapus.',
        ]);
    }
}
