<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CitizenResource extends JsonResource
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
            'nik' => $this->nik,
            'name' => $this->name,
            'date_of_birth' => $this->date_of_birth,
            'place_of_birth' => $this->place_of_birth,
            'gender' => $this->gender,
            'address' => $this->address,
            'rt_id' => $this->rt_id,
            'rw_id' => $this->rw_id,
            'hamlet_id' => $this->hamlet_id,
            'no_kk' => $this->no_kk,
            'marital_status' => $this->marital_status,
            'occupation' => $this->occupation,
            'religion' => $this->religion,
            'last_education' => $this->last_education,
            'domicile_status' => $this->domicile_status,
            'current_domicile' => $this->current_domicile,
            'is_active' => $this->is_active,
            'village' => new VillageResource($this->whenLoaded('village')),
            'rt' => new RtResource($this->whenLoaded('rt')),
            'rw' => new RwResource($this->whenLoaded('rw')),
            'hamlet' => new HamletResource($this->whenLoaded('hamlet')),
        ];
    }
}
