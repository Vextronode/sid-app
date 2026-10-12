<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterStatusLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'letter_id' => $this->letter_id,
            'actor_id' => $this->actor_id,
            'actor_name' => $this->whenLoaded('actor', fn () => $this->actor->name),
            'old_status' => $this->old_status,
            'new_status' => $this->new_status,
            'notes' => $this->reason,
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at,
        ];
    }
}
