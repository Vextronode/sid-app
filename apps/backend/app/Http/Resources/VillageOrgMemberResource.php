<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class VillageOrgMemberResource extends JsonResource
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
            'position_id' => $this->position_id,
            'member_name' => $this->member_name,
            'photo_img' => $this->photo_img ? Storage::disk('public')->url($this->photo_img) : null,
            'phone_wa' => $this->phone_wa,
            'started_at' => $this->started_at?->format('Y-m-d'),
            'ended_at' => $this->ended_at?->format('Y-m-d'),
            'is_active' => $this->is_active,
            'notes' => $this->notes,
        ];
    }
}
