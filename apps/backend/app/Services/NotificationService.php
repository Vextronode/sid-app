<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\NotificationRepository;
use Illuminate\Support\Collection;

class NotificationService
{
    public function __construct(
        protected NotificationRepository $notificationRepository
    ) {}

    public function getForUser(User $user): Collection
    {
        return $this->notificationRepository
            ->allForUserLatestFirst($user)
            ->map(function ($notification) {

                $data = $notification->data;

                return [
                    'id' => $notification->id,

                    'type' => class_basename($notification->type),

                    'title' => $data['title'] ?? null,
                    'message' => $data['message'] ?? null,

                    'category' => $data['category'] ?? 'umum',

                    'icon' => $data['icon'] ?? 'bell',

                    'color' => $data['color'] ?? 'gray',

                    'read' => $notification->read_at !== null,

                    'created_at' => $notification->created_at,

                    'time' => $notification->created_at->diffForHumans(),

                    'context' => $data['context'] ?? [],
                ];
            });
    }

    public function markAsRead(User $user, string $id): void
    {
        $notification = $this->notificationRepository->findOrFailForUser($user, $id);

        $this->notificationRepository->markAsRead($notification);
    }

    public function markAllAsRead(User $user): void
    {
        $this->notificationRepository->markAllAsReadForUser($user);
    }

    public function getUnreadCount(User $user): int
    {
        return $this->notificationRepository->countUnreadForUser($user);
    }
}
