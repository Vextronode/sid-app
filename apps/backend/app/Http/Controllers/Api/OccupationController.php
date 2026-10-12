<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexOccupationRequest;
use App\Http\Requests\StoreOccupationRequest;
use App\Http\Requests\UpdateOccupationRequest;
use App\Http\Resources\OccupationCollection;
use App\Http\Resources\OccupationResource;
use App\Services\OccupationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OccupationController extends Controller
{
    public function __construct(
        private readonly OccupationService $service,
    ) {}

    public function index(IndexOccupationRequest $request): JsonResponse
    {
        $occupations = $this->service->list(
            $request->user(),
            $request->boolean('include_inactive'),
        );

        return (new OccupationCollection($occupations))->response();
    }

    public function store(StoreOccupationRequest $request): JsonResponse
    {
        $occupation = $this->service->create($request->user(), $request->validated());

        return (new OccupationResource($occupation))->response()->setStatusCode(201);
    }

    public function update(UpdateOccupationRequest $request, int $id): JsonResponse
    {
        $occupation = $this->service->update($request->user(), $id, $request->validated());

        return (new OccupationResource($occupation))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->delete($request->user(), $id);

        return response()->json(['message' => 'Pekerjaan berhasil dihapus.']);
    }
}
