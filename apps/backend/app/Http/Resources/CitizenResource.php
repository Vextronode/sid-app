<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CitizenResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * NIK dan No KK tidak pernah dikirim plaintext (paths/citizens/citizens.yaml).
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'village_id' => $this->village_id,
            'nik_masked' => $this->mask($this->nik),
            'name' => $this->name,
            'date_of_birth' => $this->date_of_birth,
            'place_of_birth' => $this->place_of_birth,
            'gender' => $this->gender,
            'blood_type' => $this->blood_type,
            'address' => $this->address,
            'rt_id' => $this->rt_id,
            'rw_id' => $this->rw_id,
            'hamlet_id' => $this->hamlet_id,
            'family_id' => $this->family_id,
            'family' => $this->when(
                $this->relationLoaded('family') && $this->family,
                fn () => [
                    'id' => $this->family->id,
                    'no_kk_masked' => $this->mask($this->family->no_kk),
                ]
            ),
            'family_role' => $this->family_role,
            'father_id' => $this->father_id,
            'mother_id' => $this->mother_id,
            'father_name_text' => $this->father_name_text,
            'mother_name_text' => $this->mother_name_text,
            'marital_status' => $this->marital_status,
            'occupation' => $this->occupation,
            'religion' => $this->religion,
            'last_education' => $this->last_education,
            'domicile_status' => $this->domicile_status,
            'current_domicile' => $this->current_domicile,
            'residency_type' => $this->residency_type,
            'origin_region' => $this->origin_region,
            'data_source' => $this->data_source,
            'last_verified_at' => $this->last_verified_at,
            'sync_status' => $this->sync_status,
            'is_active' => $this->is_active,
            'village' => new VillageResource($this->whenLoaded('village')),
            'rt' => new RtResource($this->whenLoaded('rt')),
            'rw' => new RwResource($this->whenLoaded('rw')),
            'hamlet' => new HamletResource($this->whenLoaded('hamlet')),
        ];
    }

    private function mask(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        return str_repeat('*', max(strlen($value) - 4, 0)).substr($value, -4);
    }
}
