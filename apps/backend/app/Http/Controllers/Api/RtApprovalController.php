<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RtDecisionRequest;
use App\Models\Letter;
use App\Services\RtApprovalService;

class RtApprovalController extends Controller
{
    public function __construct(
        protected RtApprovalService $service
    ) {}

    public function decision(
        RtDecisionRequest $request,
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
