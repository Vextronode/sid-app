<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyVillageOrgPositionRequest;
use App\Http\Requests\IndexVillageOrgPositionRequest;
use App\Http\Requests\StoreVillageOrgPositionRequest;
use App\Http\Requests\UpdateVillageOrgPositionRequest;
use App\Http\Resources\VillageOrgPositionCollection;
use App\Http\Resources\VillageOrgPositionResource;
use App\Services\VillageOrgPositionService;
use Illuminate\Http\JsonResponse;

class VillageOrgPositionController extends Controller
{
    public function __construct(
        private readonly VillageOrgPositionService $service,
    ) {}

    public function index(IndexVillageOrgPositionRequest $request): JsonResponse
    {
        $positions = $this->service->list($request->user(), $request->query('org_type'));

        return (new VillageOrgPositionCollection($positions))->response();
    }

    public function store(StoreVillageOrgPositionRequest $request): JsonResponse
    {
        $position = $this->service->create($request->user(), $request->validated());

        return (new VillageOrgPositionResource($position))->response()->setStatusCode(201);
    }

    public function update(UpdateVillageOrgPositionRequest $request, int $id): JsonResponse
    {
        $position = $this->service->update($id, $request->validated());

        return (new VillageOrgPositionResource($position))->response();
    }

    public function destroy(DestroyVillageOrgPositionRequest $request, int $id): JsonResponse
    {
        $this->service->delete($id);

        return response()->json(['message' => 'Jabatan organisasi berhasil dihapus']);
    }
}
