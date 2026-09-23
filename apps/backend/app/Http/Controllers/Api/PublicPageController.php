<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PublicNewsListRequest;
use App\Http\Resources\NewsResource;
use App\Http\Resources\PublicContactResource;
use App\Http\Resources\PublicLetterTypeResource;
use App\Http\Resources\RegulationResource;
use App\Http\Resources\VillageResource;
use App\Services\PublicPageService;
use Illuminate\Http\JsonResponse;

class PublicPageController extends Controller
{
    public function __construct(
        private readonly PublicPageService $service,
    ) {}

    public function home(): JsonResponse
    {
        $home = $this->service->home();

        return response()->json([
            'data' => [
                'village' => new VillageResource($home['village']),
                'latest_news' => NewsResource::collection($home['latest_news']),
                'public_stats' => $home['public_stats'],
            ],
        ]);
    }

    public function villageProfile(): JsonResponse
    {
        return (new VillageResource($this->service->villageProfile()))->response();
    }

    public function newsList(PublicNewsListRequest $request): JsonResponse
    {
        $paginator = $this->service->paginatedNews();

        return response()->json([
            'data' => NewsResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function letterTypeList(): JsonResponse
    {
        return response()->json([
            'data' => PublicLetterTypeResource::collection($this->service->letterTypeList()),
        ]);
    }

    public function regulationList(): JsonResponse
    {
        return response()->json([
            'data' => RegulationResource::collection($this->service->regulationList()),
        ]);
    }

    public function contactUs(): JsonResponse
    {
        return response()->json([
            'data' => PublicContactResource::collection($this->service->contactUs()),
        ]);
    }
}
