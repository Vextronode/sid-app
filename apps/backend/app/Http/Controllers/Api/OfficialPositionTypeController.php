<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOfficialPositionTypeRequest;
use App\Http\Requests\UpdateOfficialPositionTypeRequest;
use App\Http\Resources\OfficialPositionTypeResource;
use App\Services\OfficialPositionTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfficialPositionTypeController extends Controller
{
    public function __construct(
        private readonly OfficialPositionTypeService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return OfficialPositionTypeResource::collection($this->service->list($request->user()))->response();
    }

    public function store(StoreOfficialPositionTypeRequest $request): JsonResponse
    {
        $type = $this->service->create($request->user(), $request->validated());

        return (new OfficialPositionTypeResource($type))->response()->setStatusCode(201);
    }

    public function update(UpdateOfficialPositionTypeRequest $request, int $id): JsonResponse
    {
        $type = $this->service->update($request->user(), $id, $request->validated());

        return (new OfficialPositionTypeResource($type))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->delete($request->user(), $id);

        return response()->json(['message' => 'Jenis jabatan berhasil dihapus.']);
    }
}
