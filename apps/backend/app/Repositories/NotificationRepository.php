<?php

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\DatabaseNotification;

class NotificationRepository
{
    public function __construct()
    {
        //
    }

    public function allForUserLatestFirst(User $user): Collection
    {
        return $user->notifications()
            ->latest()
            ->get();
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
}
