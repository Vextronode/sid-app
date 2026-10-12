<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateLetterTypeRequest;
use App\Http\Resources\LetterTypeCollection;
use App\Http\Resources\LetterTypeResource;
use App\Models\LetterType;
use App\Services\LetterTypeService;
use Illuminate\Http\Request;

class LetterTypeController extends Controller
{
    public function __construct(
        protected LetterTypeService $letterTypeService
    ) {}

    public function index(Request $request)
    {
        $letterTypes = $this->letterTypeService->getActiveWithTemplate($request->user());

        return response()->json([
            'message' => 'Daftar jenis surat berhasil diambil.',
            'data' => new LetterTypeCollection($letterTypes),
        ]);
    }

    public function update(UpdateLetterTypeRequest $request, LetterType $letterType)
    {
        $letterType = $this->letterTypeService->update($letterType, $request->validated(), $request->user());

        return response()->json([
            'data' => new LetterTypeResource($letterType),
        ]);
    }
}
