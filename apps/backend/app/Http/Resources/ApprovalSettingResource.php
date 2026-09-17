<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalSettingResource extends JsonResource
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
            'approval_level' => $this->approval_level,
            'deadline_hours' => $this->deadline_hours,
            'reminder_hours' => $this->reminder_hours,
            'is_active' => $this->is_active,
        ];
    }
}
