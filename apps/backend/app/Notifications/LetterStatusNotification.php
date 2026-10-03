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

            'category' => 'pelayanan',

            'icon' => match ($this->status) {

                'kasi_approved',
                'letter_approved_final' => 'signature',

                'waiting_revision_warga' => 'edit',

                'letter_ready_for_print' => 'document',

                default => 'document',
            },

            'color' => match ($this->status) {

                'rt_approved',
                'rw_approved' => 'blue',

                'kasi_approved',
                'letter_approved_final' => 'green',

                'letter_ready_for_print' => 'blue',

                'waiting_revision_warga' => 'amber',

                'rt_rejected',
                'rw_rejected',
                'kasi_rejected' => 'red',

                default => 'gray',
            },

            'context' => [

                'letter_id' => $this->letter->id,

                'letter_no' => $this->letter->letter_number,

                'status' => $this->status,

                'applicant' => $this->letter->applicant_name,
            ],

        ];
    }
}
