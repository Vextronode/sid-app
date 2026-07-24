<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Letter;
use App\Http\Requests\RtDecisionRequest;
use App\Services\RtApprovalService;

class RtApprovalController extends Controller
{
    public function __construct(
        protected RtApprovalService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getPendingLetters(
            $request->user()
        );

        return response()->json([
            'message' => 'Daftar surat RT berhasil diambil.',
            'data' => $letters,
        ]);
    }

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

    public function show(Letter $letter)
    {
        $letter->load([
            'citizen',
            'letterType',
            'approvals.approvedBy:id,name'
        ]);


        return response()->json([
            'message'=>'Detail surat berhasil diambil',
            'data'=>$letter
        ]);
    }

}
