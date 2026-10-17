<?php

namespace App\Http\Controllers\Api;

use App\Enums\OfficialPosition;
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
        // account_positions: jabatan berakun (enum) beserta labelnya, supaya
        // dashboard tidak menulis label sendiri. Label staf aplikasi mengikuti
        // SID_APP_NAME; scope = kolom wilayah yang wajib diisi saat penetapan.
        return OfficialPositionTypeResource::collection($this->service->list($request->user()))
            ->additional([
                'account_positions' => array_map(fn (OfficialPosition $position) => [
                    'code' => $position->value,
                    'label' => $position->label(),
                    'scope' => $position->scopeColumn(),
                ], OfficialPosition::assignable()),
            ])
            ->response();
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
