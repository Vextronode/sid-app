<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\Letter;
use App\Services\IdentityRevealService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NIK / No. KK utuh untuk tombol "lihat" di samping nilai tersamar.
 * Hak akses dan pencatatan ada di IdentityRevealService.
 */
class IdentityController extends Controller
{
    public function __construct(
        protected IdentityRevealService $identityRevealService,
    ) {}

    public function citizen(Request $request, Citizen $citizen): JsonResponse
    {
        return response()->json(['data' => $this->identityRevealService->citizen($request->user(), $citizen)]);
    }

    public function family(Request $request, Family $family): JsonResponse
    {
        return response()->json(['data' => $this->identityRevealService->family($request->user(), $family)]);
    }

    public function letterApplicant(Request $request, Letter $letter): JsonResponse
    {
        return response()->json(['data' => $this->identityRevealService->letterApplicant($request->user(), $letter)]);
    }
}
