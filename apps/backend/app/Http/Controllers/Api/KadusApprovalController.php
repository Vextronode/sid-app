<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KadusDecisionRequest;
use App\Http\Resources\LetterCollection;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\KadusApprovalService;
use Illuminate\Http\Request;

class KadusApprovalController extends Controller
{
    public function __construct(
        protected KadusApprovalService $service
    ) {}

    public function index(Request $request)
    {

        return response()->json([
            'data' => new LetterCollection($this->service->getLetters(
                $request->user()
            )),
        ]);

    }

    public function decision(
        KadusDecisionRequest $request,
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

    public function show(Letter $letter)
    {
        $letter = $this->service->getLetterDetail($letter);

        return response()->json([
            'message' => 'Detail surat berhasil diambil',
            'data' => new LetterResource($letter),
        ]);
    }
}
