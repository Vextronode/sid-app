<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShowFamilySocioeconomicRequest;
use App\Http\Requests\UpsertFamilySocioeconomicRequest;
use App\Http\Resources\FamilySocioeconomicResource;
use App\Services\FamilySocioeconomicService;
use Illuminate\Http\JsonResponse;

class FamilySocioeconomicController extends Controller
{
    public function __construct(
        private readonly FamilySocioeconomicService $service,
    ) {}

    public function show(ShowFamilySocioeconomicRequest $request, string $id): JsonResponse
    {
        $socioeconomic = $this->service->get($request->user(), $id);

        return (new FamilySocioeconomicResource($socioeconomic))->response();
    }

    public function upsert(UpsertFamilySocioeconomicRequest $request, string $id): JsonResponse
    {
        $socioeconomic = $this->service->upsert($request->user(), $id, $request->validated());

        return (new FamilySocioeconomicResource($socioeconomic))->response()->setStatusCode(200);
    }
}
