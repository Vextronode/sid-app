<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyNewsRequest;
use App\Http\Requests\IndexNewsRequest;
use App\Http\Requests\StoreNewsRequest;
use App\Http\Requests\UpdateNewsRequest;
use App\Http\Resources\NewsCollection;
use App\Http\Resources\NewsResource;
use App\Services\NewsService;
use Illuminate\Http\JsonResponse;

class NewsController extends Controller
{
    public function __construct(
        private readonly NewsService $service,
    ) {}

    public function index(IndexNewsRequest $request): JsonResponse
    {
        $news = $this->service->list($request->user(), $request->validated('status'));

        return (new NewsCollection($news))->response();
    }

    public function store(StoreNewsRequest $request): JsonResponse
    {
        $news = $this->service->create($request->user(), $request->validated());

        return (new NewsResource($news))->response()->setStatusCode(201);
    }

    public function update(UpdateNewsRequest $request, int $id): JsonResponse
    {
        $news = $this->service->update($id, $request->validated());

        return (new NewsResource($news))->response();
    }

    public function destroy(DestroyNewsRequest $request, int $id): JsonResponse
    {
        $this->service->delete($id);

        return response()->json(['message' => 'Berita berhasil dihapus']);
    }
}
