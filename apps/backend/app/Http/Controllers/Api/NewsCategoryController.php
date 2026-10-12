<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNewsCategoryRequest;
use App\Http\Requests\UpdateNewsCategoryRequest;
use App\Http\Resources\NewsCategoryResource;
use App\Services\NewsCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsCategoryController extends Controller
{
    public function __construct(
        private readonly NewsCategoryService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return NewsCategoryResource::collection($this->service->list($request->user()))->response();
    }

    public function store(StoreNewsCategoryRequest $request): JsonResponse
    {
        $category = $this->service->create($request->user(), $request->validated());

        return (new NewsCategoryResource($category))->response()->setStatusCode(201);
    }

    public function update(UpdateNewsCategoryRequest $request, int $id): JsonResponse
    {
        $category = $this->service->update($request->user(), $id, $request->validated());

        return (new NewsCategoryResource($category))->response();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->delete($request->user(), $id);

        return response()->json(['message' => 'Kategori berita berhasil dihapus.']);
    }
}
