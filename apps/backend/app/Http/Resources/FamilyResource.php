<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyResource extends JsonResource
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
            'no_kk_masked' => $this->maskNoKk($this->no_kk),
            'family_address' => $this->family_address,
            'family_status' => $this->family_status,
            'rt_id' => $this->rt_id,
            'rw_id' => $this->rw_id,
            'hamlet_id' => $this->hamlet_id,
            'head_of_family_id' => $this->head_of_family_id,
            'head_of_family' => $this->when(
                $this->relationLoaded('headOfFamily') && $this->headOfFamily,
                fn () => [
                    'id' => $this->headOfFamily->id,
                    'name' => $this->headOfFamily->name,
                ]
            ),
            'members_count' => $this->when(
                $this->relationLoaded('members'),
                fn () => $this->members->count()
            ),
            'village' => new VillageResource($this->whenLoaded('village')),
            'rt' => new RtResource($this->whenLoaded('rt')),
            'rw' => new RwResource($this->whenLoaded('rw')),
            'hamlet' => new HamletResource($this->whenLoaded('hamlet')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function maskNoKk(?string $noKk): ?string
    {
        if (! $noKk) {
            return null;
        }

        $last4 = substr($noKk, -4);

        return str_repeat('*', max(strlen($noKk) - 4, 0)).$last4;
    }
}
