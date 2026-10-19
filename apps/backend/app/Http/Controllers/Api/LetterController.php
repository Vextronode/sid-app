<?php

namespace App\Http\Controllers\Api;

use App\Exports\LettersExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\LetterIndexRequest;
use App\Http\Requests\LetterSummaryRequest;
use App\Http\Requests\StoreLetterRequest;
use App\Http\Resources\LetterListResource;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\LetterService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

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

        $letters = $this->letterService->paginateScopedLetters(
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Daftar surat berhasil diambil.',
            'data' => LetterListResource::collection($letters->getCollection()),
            'meta' => [
                'current_page' => $letters->currentPage(),
                'per_page' => $letters->perPage(),
                'total' => $letters->total(),
                'last_page' => $letters->lastPage(),
            ],
        ]);
    }

    public function summary(LetterSummaryRequest $request)
    {
        $this->authorize('viewAny', Letter::class);

        return response()->json([
            'message' => 'Ringkasan surat berhasil diambil.',
            'data' => $this->letterService->summarizeScopedLetters(
                $request->user(),
                $request->validated()
            ),
        ]);
    }

    /**
     * Laporan Excel atas scope dan filter yang sama dengan daftar surat.
     * Hasil kosong ditolak (422) agar klien tidak mengunduh file kosong.
     */
    public function export(LetterIndexRequest $request)
    {
        $this->authorize('viewAny', Letter::class);

        $letters = $this->letterService->exportScopedLetters(
            $request->user(),
            $request->validated()
        );

        if ($letters->isEmpty()) {
            return response()->json([
                'message' => 'Data surat kosong, laporan tidak dapat diunduh.',
            ], 422);
        }

        return Excel::download(
            new LettersExport($letters),
            'laporan-surat-'.now()->format('Y-m-d').'.xlsx'
        );
    }

    public function show($id)
    {
        $letter = $this->letterService->getForShow($id);

        $this->authorize('view', $letter);

        return response()->json([
            'message' => 'Detail surat berhasil diambil.',
            'data' => new LetterResource($letter),
        ]);
    }

    public function destroy(Request $request, Letter $letter)
    {
        $this->authorize('delete', $letter);

        $this->letterService->delete(
            $letter,
            $request->user()
        );

        return response()->json(['message' => 'Surat berhasil dihapus.']);
    }
}
