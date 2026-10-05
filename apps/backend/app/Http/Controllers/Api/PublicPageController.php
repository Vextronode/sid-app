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
use Illuminate\Http\Request;

class PublicPageController extends Controller
{
    public function __construct(
        private readonly PublicPageService $service,
    ) {}

    public function home(Request $request): JsonResponse
    {
        $home = $this->service->home($request->query('village_code'));

        return response()->json([
            'data' => [
                'village' => new VillageResource($home['village']),
                'latest_news' => NewsResource::collection($home['latest_news']),
                'public_stats' => $home['public_stats'],
            ],
        ]);
    }

    public function villageProfile(Request $request): JsonResponse
    {
        return (new VillageResource($this->service->villageProfile($request->query('village_code'))))->response();
    }

    public function newsList(PublicNewsListRequest $request): JsonResponse
    {
        $paginator = $this->service->paginatedNews($request->query('village_code'));

        return NewsResource::collection($paginator)->response();
    }

    public function letterTypeList(Request $request): JsonResponse
    {
        return response()->json([
            'data' => PublicLetterTypeResource::collection($this->service->letterTypeList($request->query('village_code'))),
        ]);
    }

    public function regulationList(Request $request): JsonResponse
    {
        return response()->json([
            'data' => RegulationResource::collection($this->service->regulationList($request->query('village_code'))),
        ]);
    }

    public function contactUs(Request $request): JsonResponse
    {
        return response()->json([
            'data' => PublicContactResource::collection($this->service->contactUs($request->query('village_code'))),
        ]);
    }
}
