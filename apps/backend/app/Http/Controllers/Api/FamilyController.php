<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexFamilyRequest;
use App\Http\Requests\StoreFamilyRequest;
use App\Http\Requests\UpdateFamilyRequest;
use App\Http\Resources\FamilyCollection;
use App\Http\Resources\FamilyResource;
use App\Models\Family;
use App\Services\FamilyService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class FamilyController extends Controller
{
    public function __construct(
        protected FamilyService $familyService
    ) {}

    public function index(IndexFamilyRequest $request)
    {
        $families = $this->familyService->paginateWithWilayah($request->user(), $request->validated());

        return (new FamilyCollection($families))->response()->setStatusCode(200);
    }

    // Pilihan KK di form warga: semua KK desa, hanya kolom yang perlu.
    public function options()
    {
        $families = $this->familyService->options(request()->user());

        return response()->json([
            'data' => $families
                ->map(fn ($family) => Arr::only(
                    (new FamilyResource($family))->resolve(request()),
                    ['id', 'no_kk_masked', 'family_address', 'head_of_family'],
                ))
                ->values(),
        ]);
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

    public function destroy(Request $request, Family $family)
    {
        $this->familyService->delete($family, $request->user());

        return response()->json([
            'message' => 'Kartu Keluarga berhasil dihapus.',
        ])->setStatusCode(200);
    }
}
