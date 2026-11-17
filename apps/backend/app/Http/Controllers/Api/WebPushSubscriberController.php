<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexWebPushSubscriberRequest;
use App\Http\Resources\WebPushSubscriberResource;
use App\Models\PushSubscription;
use App\Services\WebPushSubscriberService;
use Illuminate\Http\JsonResponse;

/**
 * Menu Pelanggan Notifikasi (Staf SIDUTama).
 */
class WebPushSubscriberController extends Controller
{
    public function __construct(
        private readonly WebPushSubscriberService $webPushSubscriberService,
    ) {}

    public function index(IndexWebPushSubscriberRequest $request): JsonResponse
    {
        $subscribers = $this->webPushSubscriberService->paginate($request->user(), $request->validated());

        return response()->json([
            'message' => 'Daftar pelanggan notifikasi berhasil diambil.',
            'data' => WebPushSubscriberResource::collection($subscribers->getCollection()),
            'meta' => [
                'current_page' => $subscribers->currentPage(),
                'per_page' => $subscribers->perPage(),
                'total' => $subscribers->total(),
                'last_page' => $subscribers->lastPage(),
                'active_days' => PushSubscription::ACTIVE_DAYS,
                'summary' => $this->webPushSubscriberService->summary($request->user()),
            ],
        ]);
    }
}
