<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'village_id' => $this->village_id,
            'citizen_id' => $this->citizen_id,
            'name' => $this->name,
            'username' => $this->username,
            'role' => $this->role,
            'email' => $this->email,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'official' => new OfficialResource($this->whenLoaded('official')),
        ];
    }
}
