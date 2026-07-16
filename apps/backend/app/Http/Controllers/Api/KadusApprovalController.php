<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KadusDecisionRequest;
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
            'message' => 'Daftar surat berhasil diambil.',
            'data' => $this->service
                ->getPendingLetters($request->user()),
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
}
