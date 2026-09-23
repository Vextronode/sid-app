<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyRegulationRequest;
use App\Http\Requests\IndexRegulationRequest;
use App\Http\Requests\StoreRegulationRequest;
use App\Http\Requests\UpdateRegulationRequest;
use App\Http\Resources\RegulationCollection;
use App\Http\Resources\RegulationResource;
use App\Services\RegulationService;
use Illuminate\Http\JsonResponse;

class RegulationController extends Controller
{
    public function __construct(
        private readonly RegulationService $service,
    ) {}

    public function index(IndexRegulationRequest $request): JsonResponse
    {
        $regulations = $this->service->list($request->user());

        return (new RegulationCollection($regulations))->response();
    }

    public function store(StoreRegulationRequest $request): JsonResponse
    {
        $regulation = $this->service->create($request->user(), $request->validated());

        return (new RegulationResource($regulation))->response()->setStatusCode(201);
    }

    public function update(UpdateRegulationRequest $request, int $id): JsonResponse
    {
        $regulation = $this->service->update($id, $request->validated());

        return (new RegulationResource($regulation))->response();
    }

    public function destroy(DestroyRegulationRequest $request, int $id): JsonResponse
    {
        $this->service->delete($id);

        return response()->json(['message' => 'Peraturan desa berhasil dihapus']);
    }
}
