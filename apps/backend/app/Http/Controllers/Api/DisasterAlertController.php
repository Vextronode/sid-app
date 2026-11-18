<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DismissDisasterAlertRequest;
use App\Http\Requests\IndexDisasterAlertRequest;
use App\Http\Resources\DisasterAlertResource;
use App\Models\DisasterAlert;
use App\Services\DisasterAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

/**
 * Tab Peringatan SIGAP di halaman Pengumuman (Staf SIDUTama): daftar
 * peringatan yang tampil dan yang diturunkan, turunkan satu per satu, dan
 * tampilkan lagi. Isi peringatan tidak bisa diubah dari sini.
 */
class DisasterAlertController extends Controller
{
    public function __construct(
        protected DisasterAlertService $disasterAlertService,
    ) {}

    public function index(IndexDisasterAlertRequest $request): AnonymousResourceCollection
    {
        return DisasterAlertResource::collection($this->disasterAlertService->listForStaff(
            (string) $request->user()->village_id,
            $request->listStatus(),
        ));
    }

    public function dismiss(DismissDisasterAlertRequest $request, DisasterAlert $disasterAlert): JsonResponse
    {
        $this->ensureSameVillage($request, $disasterAlert);

        $alert = $this->disasterAlertService->dismiss(
            $disasterAlert,
            $request->user(),
            Str::squish((string) $request->validated('reason')),
        );

        return $this->alertResponse($alert, 'Peringatan diturunkan dari halaman publik.');
    }

    public function restore(Request $request, DisasterAlert $disasterAlert): JsonResponse
    {
        $this->ensureSameVillage($request, $disasterAlert);

        $alert = $this->disasterAlertService->restore($disasterAlert, $request->user());

        return $this->alertResponse($alert, 'Peringatan ditampilkan lagi di halaman publik.');
    }

    private function ensureSameVillage(Request $request, DisasterAlert $alert): void
    {
        abort_unless($alert->village_id === $request->user()->village_id, 404);
    }

    private function alertResponse(DisasterAlert $alert, string $message): JsonResponse
    {
        return response()->json([
            'data' => (new DisasterAlertResource($alert->load('integrationClient:id,name')))->resolve(),
            'message' => $message,
        ]);
    }
}
