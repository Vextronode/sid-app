<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KasiApprovalRequest;
use App\Models\Letter;
use App\Services\KasiApprovalService;
use Illuminate\Http\Request;

class KasiApprovalController extends Controller
{
    public function __construct(
        protected KasiApprovalService $service
    ) {}

    public function index(Request $request)
    {
        return response()->json(
            $this->service->getPendingLetters(
                $request->user()
            )
        );
    }

    public function approve(
        KasiApprovalRequest $request,
        Letter $letter
    ) {
        $this->service->approve(
            $letter,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Approval berhasil diproses.',
        ]);
    }
}