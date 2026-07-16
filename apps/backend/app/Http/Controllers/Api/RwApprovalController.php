<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Letter;
use App\Services\RwApprovalService;
use App\Http\Requests\RwApprovalRequest;

class RwApprovalController extends Controller
{
    public function __construct(
        protected RwApprovalService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getPendingLetters(
            $request->user()
        );

        return response()->json([
            'message' => 'Daftar surat RW berhasil diambil.',
            'data' => $letters,
        ]);
    }


    public function approve(
        RwApprovalRequest $request,
        Letter $letter
    )
    {
        $this->service->approve(
            $letter,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Surat berhasil diproses.',
        ]);
    }
}