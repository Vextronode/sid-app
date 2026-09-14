<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KadesDecisionRequest;
use App\Http\Resources\LetterCollection;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\KadesApprovalService;
use Illuminate\Http\Request;

class KadesApprovalController extends Controller
{
    public function __construct(
        protected KadesApprovalService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getPendingLetters(
            $request->user()
        );

        return response()->json([
            'message' => 'Daftar surat Kepala Desa berhasil diambil.',
            'data' => new LetterCollection($letters),
        ]);
    }

    public function show(
        Request $request,
        Letter $letter
    ) {
        $detail = $this->service->getLetterDetail(
            $letter,
            $request->user()
        );

        return response()->json([
            'message' => 'Detail surat berhasil diambil.',
            'data' => new LetterResource($detail),
        ]);
    }

    public function decision(
        KadesDecisionRequest $request,
        Letter $letter
    ) {
        $this->service->decision(
            $letter,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Surat berhasil diproses.',
        ]);
    }
}
