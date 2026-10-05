<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFamilyRequest;
use App\Http\Requests\UpdateFamilyRequest;
use App\Http\Resources\FamilyCollection;
use App\Http\Resources\FamilyResource;
use App\Models\Family;
use App\Services\FamilyService;

class FamilyController extends Controller
{
    public function __construct(
        protected FamilyService $familyService
    ) {}

    public function index()
    {
        $families = $this->familyService->getAllWithWilayah(request()->user());

        return (new FamilyCollection($families))->response()->setStatusCode(200);
    }

    public function show(Family $family)
    {
        $family = $this->familyService->find($family->id, request()->user());

        return (new FamilyResource($family))->response()->setStatusCode(200);
    }

    public function store(StoreFamilyRequest $request)
    {
        $family = $this->familyService->create($request->validated(), $request->user());

        return (new FamilyResource($family))->response()->setStatusCode(201);
    }

    public function update(UpdateFamilyRequest $request, Family $family)
    {
        $family = $this->familyService->update($family, $request->validated(), $request->user());

        return (new FamilyResource($family))->response()->setStatusCode(200);
    }

    public function destroy(\Illuminate\Http\Request $request, Family $family)
    {
        $this->familyService->delete($family, $request->user());

        return response()->json([
            'message' => 'Kartu Keluarga berhasil dihapus.',
        ])->setStatusCode(200);
    }
}
