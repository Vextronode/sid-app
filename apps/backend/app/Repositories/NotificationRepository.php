<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Carbon;

class NotificationRepository
{
    public function __construct()
    {
        //
    }

    public function paginateForUserLatestFirst(User $user, int $perPage): LengthAwarePaginator
    {
        return $user->notifications()
            ->latest()
            ->paginate($perPage);
    }

    public function findOrFailForUser(User $user, string $id): Collection|Model
    {
        return $user->notifications()->findOrFail($id);
    }

    public function markAsRead(DatabaseNotification $notification): void
    {
        $notification->markAsRead();
    }

    public function markAllAsReadForUser(User $user): void
    {
        $user->unreadNotifications->markAsRead();
    }

    public function countUnreadForUser(User $user): int
    {
        return $user->unreadNotifications()->count();
    }

    /** Notifikasi yang dibaca sebelum $cutoff; yang belum dibaca tidak disentuh. */
    public function deleteReadBefore(Carbon $cutoff): int
    {
        return DatabaseNotification::query()
            ->whereNotNull('read_at')
            ->where('read_at', '<', $cutoff)
            ->delete();
    }
}
