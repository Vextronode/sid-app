<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LetterCategoryCollection;
use App\Services\LetterCategoryService;
use Illuminate\Http\JsonResponse;

class LetterCategoryController extends Controller
{
    public function __construct(
        private readonly LetterCategoryService $service,
    ) {}

    public function index(): JsonResponse
    {
        return (new LetterCategoryCollection($this->service->getAllCategories()))
            ->response()
            ->setStatusCode(200);
    }
}
