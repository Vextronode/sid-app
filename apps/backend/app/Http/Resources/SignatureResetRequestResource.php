<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SignatureResetRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reason' => $this->reason,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'handled_at' => $this->handled_at,
            'response_notes' => $this->response_notes,
            'handler' => $this->whenLoaded('handler', fn () => $this->handler === null ? null : [
                'id' => $this->handler->id,
                'name' => $this->handler->name,
            ]),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'username' => $this->user->username,
                'role' => $this->user->role,
                'role_label' => UserRole::tryFrom((string) $this->user->role)?->label(),
            ]),
        ];
    }
}
