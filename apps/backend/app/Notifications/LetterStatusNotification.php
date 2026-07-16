<?php

namespace App\Notifications;

use App\Models\Letter;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LetterStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Letter $letter,
        protected string $title,
        protected string $message,
        protected string $status,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'letter_id' => $this->letter->id,
            'status' => $this->status,
        ];
    }
}