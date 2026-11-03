<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Satu entri tindakan atas akun pengguna (activity_log `user` /
 * `password_reset_request`).
 */
class AccountLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $properties = $this->properties;

        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'event' => $this->event,
            'description' => $this->description,
            'subject_label' => $properties['subject_label'] ?? null,
            'notes' => $properties['notes'] ?? null,
            'via' => $properties['via'] ?? null,
            'changes' => (object) ($properties['changes'] ?? []),
            'actor' => $this->causer ? [
                'id' => $this->causer->id,
                'name' => $this->causer->name,
                'role' => $this->causer->role,
                'role_label' => UserRole::tryFrom((string) $this->causer->role)?->label(),
            ] : null,
            'created_at' => $this->created_at,
        ];
    }
}
