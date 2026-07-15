<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Services\RwApprovalService;
use App\Http\Requests\RwApprovalRequest;

class RwApprovalController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $official = $user->official;

        $letters = Letter::query()
            ->with([
                'citizen',
                'letterType',
            ])
            ->where('status', 'rt_approved')
            ->where('village_id', $official->village_id)
            ->latest()
            ->get();

        return response()->json([
            'message' => 'Daftar surat berhasil diambil.',
            'data' => $letters,
        ]);
    }

    protected RwApprovalService $rwApprovalService;

    public function __construct(
        RwApprovalService $rwApprovalService
    ){
        $this->rwApprovalService = $rwApprovalService;
    }

    public function approve(
        RwApprovalRequest $request,
        Letter $letter
    ){
        return $this->rwApprovalService
            ->approve($letter, $request->validated());
    }

    
}