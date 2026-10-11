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
use App\Support\PublicPageCache;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicPageController extends Controller
{
    public function __construct(
        private readonly PublicPageService $service,
    ) {}

    public function home(Request $request): JsonResponse
    {
        return $this->cached($request, 'home', function () use ($request) {
            $home = $this->service->home($request->query('village_code'));

            return response()->json([
                'data' => [
                    'village' => new VillageResource($home['village']),
                    'latest_news' => NewsResource::collection($home['latest_news']),
                    'public_stats' => $home['public_stats'],
                ],
            ]);
        });
    }

    public function villageProfile(Request $request): JsonResponse
    {
        return $this->cached($request, 'village-profile', fn () => (new VillageResource(
            $this->service->villageProfile($request->query('village_code'))
        ))->response());
    }

    public function newsList(PublicNewsListRequest $request): JsonResponse
    {
        // Paginator membaca nomor halaman dari request, jadi tiap halaman
        // punya entri cache sendiri.
        $section = 'news:'.max(1, (int) $request->query('page', 1));

        return $this->cached($request, $section, fn () => NewsResource::collection(
            $this->service->paginatedNews($request->query('village_code'))
        )->response());
    }

    public function letterTypeList(Request $request): JsonResponse
    {
        return $this->cached($request, 'letter-types', fn () => response()->json([
            'data' => PublicLetterTypeResource::collection($this->service->letterTypeList($request->query('village_code'))),
        ]));
    }

    public function regulationList(Request $request): JsonResponse
    {
        return $this->cached($request, 'regulations', fn () => response()->json([
            'data' => RegulationResource::collection($this->service->regulationList($request->query('village_code'))),
        ]));
    }

    public function contactUs(Request $request): JsonResponse
    {
        return $this->cached($request, 'contact-us', fn () => response()->json([
            'data' => PublicContactResource::collection($this->service->contactUs($request->query('village_code'))),
        ]));
    }

    /**
     * Respons publik sama untuk semua pengunjung, jadi JSON-nya di-cache
     * per desa. Desa tetap di-resolve tiap request supaya kode desa yang
     * salah atau data kosong (exception 404/422 dari service) tidak
     * pernah ikut tersimpan.
     *
     * @param  Closure(): JsonResponse  $build
     */
    private function cached(Request $request, string $section, Closure $build): JsonResponse
    {
        $village = $this->service->requireVillage($request->query('village_code'));

        return JsonResponse::fromJsonString(
            PublicPageCache::remember($village->id, $section, fn () => $build()->getContent())
        );
    }
}
