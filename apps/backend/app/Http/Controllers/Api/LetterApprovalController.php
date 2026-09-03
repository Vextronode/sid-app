<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Services\LetterApprovalService;
use Illuminate\Http\Request;

class LetterApprovalController extends Controller
{
    public function __construct(
        protected LetterApprovalService $service
    ) {}

    public function approve(
        Request $request,
        Letter $letter
    ) {

        $official = auth()->user()
            ->official;

        $approval = $this->service->approve(
            $letter,
            $official,
            $request->status,
            $request->notes
        );

        return response()->json([
            'message' => 'Surat berhasil diproses',
            'data' => $approval,
        ]);

    }
}
