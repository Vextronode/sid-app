<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KadesDecisionRequest;
use App\Models\Letter;
use App\Services\KadesApprovalService;

class KadesApprovalController extends Controller
{
    public function __construct(
        protected KadesApprovalService $service
    ) {}

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
