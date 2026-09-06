<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OfficialResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'citizen_id' => $this->citizen_id,
            'user_id' => $this->user_id,
            'position' => $this->position,
            'village_id' => $this->village_id,
            'rt_id' => $this->rt_id,
            'rw_id' => $this->rw_id,
            'hamlet_id' => $this->hamlet_id,
            'started_at' => $this->started_at,
            'is_active' => $this->is_active,
        ];
    }
}
