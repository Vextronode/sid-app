<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexVillageOrgPositionRequest;
use App\Http\Requests\ShowVillageOrgPositionRequest;
use App\Http\Resources\VillageOrgPositionCollection;
use App\Http\Resources\VillageOrgPositionResource;
use App\Services\VillageOrgPositionService;
use Illuminate\Http\JsonResponse;

/**
 * Jabatan organisasi berupa slot tetap (Ketua, Wakil Ketua, Anggota) yang
 * dibuat otomatis, jadi hanya bisa dibaca. Pengisian lewat
 * VillageOrgMemberController.
 */
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

    public function show(ShowVillageOrgPositionRequest $request, int $id): JsonResponse
    {
        $position = $this->service->find($request->user(), $id);

        return (new VillageOrgPositionResource($position))->response();
    }
}
