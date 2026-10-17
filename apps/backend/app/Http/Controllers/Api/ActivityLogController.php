<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexLetterActivityLogRequest;
use App\Http\Requests\IndexPopulationLogRequest;
use App\Http\Resources\LetterActivityLogResource;
use App\Http\Resources\PopulationLogResource;
use App\Services\ActivityLogService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function population(IndexPopulationLogRequest $request): JsonResponse
    {
        $logs = $this->activityLogService->population($request->user(), $request->validated());

        return $this->paginated('Riwayat data kependudukan berhasil diambil.', PopulationLogResource::collection($logs->getCollection()), $logs);
    }

    public function letters(IndexLetterActivityLogRequest $request): JsonResponse
    {
        $logs = $this->activityLogService->letters($request->user(), $request->validated());

        return $this->paginated('Riwayat status surat berhasil diambil.', LetterActivityLogResource::collection($logs->getCollection()), $logs);
    }

    private function paginated(string $message, mixed $data, LengthAwarePaginator $paginator): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }
}
