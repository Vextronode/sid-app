<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $notificationService
    ) {}

    /**
     * List notifikasi user login
     */
    public function index(Request $request)
    {
        $notifications = $this->notificationService->getForUser($request->user());

        return response()->json($notifications);
    }

    /**
     * Tandai satu notifikasi dibaca
     */
    public function read(Request $request, $id)
    {
        $this->notificationService->markAsRead($request->user(), $id);

        return response()->json([
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Tandai semua dibaca
     */
    public function readAll(Request $request)
    {
        $this->notificationService->markAllAsRead($request->user());

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Jumlah unread
     */
    public function unreadCount(Request $request)
    {
        return response()->json([
            'count' => $this->notificationService->getUnreadCount($request->user()),
        ]);
    }
}
