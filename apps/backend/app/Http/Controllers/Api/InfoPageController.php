<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateInfoPageRequest;
use App\Services\InfoPageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Menu Halaman Informasi: isian PPID, Kebijakan Privasi, dan Aksesibilitas.
 */
class InfoPageController extends Controller
{
    public function __construct(
        private readonly InfoPageService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->service->allForStaff($request->user())]);
    }

    public function update(UpdateInfoPageRequest $request, string $page): JsonResponse
    {
        $saved = $this->service->save($request->user(), $page, $request->validated());

        return response()->json([
            'message' => 'Halaman informasi disimpan',
            'data' => [
                'page' => $page,
                'fields' => $saved->fields,
                'updated_at' => $saved->updated_at?->toIso8601String(),
            ],
        ]);
    }
}
