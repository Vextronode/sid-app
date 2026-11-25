<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\NotificationRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Notifications\DatabaseNotification;

class NotificationService
{
    /** Satu halaman popover lonceng; halaman berikutnya dimuat bertahap. */
    public const PER_PAGE = 20;

    public function __construct(
        protected NotificationRepository $notificationRepository
    ) {}

    public function getForUser(User $user): LengthAwarePaginator
    {
        $paginator = $this->notificationRepository->paginateForUserLatestFirst($user, self::PER_PAGE);

        $paginator->getCollection()->transform(function (DatabaseNotification $notification) {
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

        return $paginator;
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

    /**
     * Hapus notifikasi yang sudah dibaca lebih lama dari masa simpan
     * (config sid.notifications.read_retention_days). Yang belum dibaca tetap
     * disimpan berapa pun umurnya.
     */
    public function pruneRead(): int
    {
        $days = (int) config('sid.notifications.read_retention_days');

        return $this->notificationRepository->deleteReadBefore(now()->subDays($days));
    }
}
