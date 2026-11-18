<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexLetterTypeRequest;
use App\Http\Requests\UpdateLetterTypeRequest;
use App\Http\Resources\LetterTypeCollection;
use App\Http\Resources\LetterTypeResource;
use App\Models\LetterType;
use App\Services\LetterTypeService;
use App\Services\PdfService;
use App\Support\PaperSize;
use Illuminate\Http\Request;

class LetterTypeController extends Controller
{
    public function __construct(
        protected LetterTypeService $letterTypeService
    ) {}

    public function index(IndexLetterTypeRequest $request)
    {
        $letterTypes = $this->letterTypeService->list(
            $request->user(),
            $request->boolean('include_inactive'),
        );

        return response()->json([
            'message' => 'Daftar jenis surat berhasil diambil.',
            'data' => new LetterTypeCollection($letterTypes),
        ]);
    }

    /**
     * Formulir isi tangan (mis. surat pernyataan bermaterai) dengan
     * identitas pemohon; ?download=1 untuk mengunduh, selain itu pratinjau.
     */
    public function handwrittenForm(Request $request, LetterType $letterType, string $key, PdfService $pdfService)
    {
        $letterType = $this->letterTypeService->handwrittenFormType($letterType, $request->user());

        return $pdfService->handwrittenForm($letterType, $request->user(), $key, $request->boolean('download'), PaperSize::requested($request));
    }

    public function update(UpdateLetterTypeRequest $request, LetterType $letterType)
    {
        $letterType = $this->letterTypeService->update($letterType, $request->validated(), $request->user());

        return response()->json([
            'data' => new LetterTypeResource($letterType),
        ]);
    }
}
