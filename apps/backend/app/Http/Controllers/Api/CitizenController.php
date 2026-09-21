<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCitizenRequest;
use App\Http\Requests\UpdateCitizenRequest;
use App\Http\Resources\CitizenCollection;
use App\Http\Resources\CitizenResource;
use App\Models\Citizen;
use App\Services\CitizenService;

class CitizenController extends Controller
{
    public function __construct(
        protected CitizenService $citizenService
    ) {}

    public function index()
    {
        $citizens = $this->citizenService->getAllWithWilayah();

        return (new CitizenCollection($citizens))->response()->setStatusCode(200);
    }

    public function store(StoreCitizenRequest $request)
    {
        $citizen = $this->citizenService->create($request->validated(), $request->user());

        return response()->json([
            'message' => 'Data warga berhasil disimpan',
            'data' => new CitizenResource($citizen),
        ], 201);
    }

    public function update(UpdateCitizenRequest $request, Citizen $citizen)
    {
        $citizen = $this->citizenService->update($citizen, $request->validated(), $request->user());

        return response()->json([
            'data' => new CitizenResource($citizen),
        ]);
    }

    public function destroy(Citizen $citizen)
    {
        $this->citizenService->delete($citizen);

        return response()->json([
            'message' => 'Data warga berhasil dihapus.',
        ])->setStatusCode(200);
    }

    public function wilayah()
    {
        $citizens = $this->citizenService->getDistinctWilayah();

        return (new CitizenCollection($citizens))->response()->setStatusCode(200);
    }
}
