<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * List notifikasi user login
     */
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->get()
            ->map(function ($notification) {

                $data = $notification->data;

                return [
                    'id' => $notification->id,

                    'title' => $data['title'],
                    'message' => $data['message'],

                    'category' => $data['category'] ?? 'pelayanan',

                    'icon' => $data['icon'] ?? 'document',

                    'color' => $data['color'] ?? 'gray',

                    'status' => $data['status'],

                    'letter_id' => $data['letter_id'],

                    'letter_no' => $data['letter_no'] ?? null,

                    'applicant' => $data['applicant'] ?? null,

                    'read' => $notification->read_at !== null,

                    'created_at' => $notification->created_at,

                    'time' => $notification->created_at->diffForHumans(),
                ];
            });

        return response()->json($notifications);
    }

    /**
     * Tandai satu notifikasi dibaca
     */
    public function read(Request $request, $id)
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read'
        ]);
    }

    /**
     * Tandai semua dibaca
     */
    public function readAll(Request $request)
    {
        $request->user()
            ->unreadNotifications
            ->markAsRead();

        return response()->json([
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * Jumlah unread
     */
    public function unreadCount(Request $request)
    {
        return response()->json([
            'count' => $request->user()
                ->unreadNotifications()
                ->count()
        ]);
    }
}