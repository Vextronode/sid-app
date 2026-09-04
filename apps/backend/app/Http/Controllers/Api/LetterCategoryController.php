<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LetterCategoryService;
use Illuminate\Http\JsonResponse;

class LetterCategoryController extends Controller
{
    public function __construct(
        private readonly LetterCategoryService $service,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->service->getAllCategories()]);
    }
}
