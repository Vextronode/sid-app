<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VillageOrgPositionResource extends JsonResource
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
            'org_type' => $this->org_type,
            'position_label' => $this->position_label,
            'is_single_occupant' => $this->is_single_occupant,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'members' => VillageOrgMemberResource::collection($this->whenLoaded('members')),
        ];
    }
}
