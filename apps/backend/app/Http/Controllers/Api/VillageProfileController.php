<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateVillageProfileRequest;
use App\Services\VillageProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VillageProfileController extends Controller
{
    public function __construct(
        private readonly VillageProfileService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->getProfile($request->user()),
        ]);
    }

    public function update(UpdateVillageProfileRequest $request): JsonResponse
    {
        $village = $this->service->updateProfile($request->user(), $request->validated());

        return response()->json([
            'message' => 'Profil desa berhasil diperbarui',
            'data' => $village,
        ]);
    }
}
