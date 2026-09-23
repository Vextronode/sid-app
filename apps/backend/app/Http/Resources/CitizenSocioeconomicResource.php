<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CitizenSocioeconomicResource extends JsonResource
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
            'income_range' => $this->income_range,
            'house_ownership_status' => $this->house_ownership_status,
            'water_source' => $this->water_source,
            'electricity_source' => $this->electricity_source,
            'dependents_count' => $this->dependents_count,
            'productive_assets' => $this->productive_assets,
            'surveyed_at' => $this->surveyed_at,
            'surveyed_by' => $this->surveyed_by,
        ];
    }
}
