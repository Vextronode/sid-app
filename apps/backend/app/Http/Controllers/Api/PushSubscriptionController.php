<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyPushSubscriptionRequest;
use App\Http\Requests\StorePushSubscriptionRequest;
use App\Services\PushSubscriptionService;

class PushSubscriptionController extends Controller
{
    public function __construct(
        protected PushSubscriptionService $pushSubscriptionService
    ) {}

    public function store(StorePushSubscriptionRequest $request)
    {
        $this->pushSubscriptionService->subscribe($request->user(), $request->validated());

        return response()->json([
            'message' => 'Langganan push notification berhasil disimpan.',
        ], 201);
    }

    public function destroy(DestroyPushSubscriptionRequest $request)
    {
        $this->pushSubscriptionService->unsubscribe($request->user(), $request->validated()['endpoint']);

        return response()->json([
            'message' => 'Langganan push notification berhasil dihapus.',
        ]);
    }
}
