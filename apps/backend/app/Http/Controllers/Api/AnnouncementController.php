<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Services\AnnouncementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pengumuman beranda (satu per desa), khusus Petugas Desa.
 */
class AnnouncementController extends Controller
{
    public function __construct(
        private readonly AnnouncementService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $announcement = $this->service->current($request->user());

        return response()->json([
            'data' => $announcement ? new AnnouncementResource($announcement) : null,
        ]);
    }

    public function save(SaveAnnouncementRequest $request): JsonResponse
    {
        $announcement = $this->service->save($request->user(), $request->validated());

        return response()->json([
            'message' => 'Pengumuman ditayangkan',
            'data' => new AnnouncementResource($announcement),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->service->delete($request->user());

        return response()->json(['message' => 'Pengumuman dihapus']);
    }
}
