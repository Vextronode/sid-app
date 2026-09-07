<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\NotificationRepository;

class NotificationService
{
    public function __construct(
        protected NotificationRepository $notificationRepository
    ) {}

    public function getForUser(User $user): \Illuminate\Support\Collection
    {
        return $this->notificationRepository
            ->allForUserLatestFirst($user)
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
