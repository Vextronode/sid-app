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
            'signature_img' => $this->signature_img,
            'stamp_img' => $this->stamp_img,
            'photo_img' => $this->photo_img,
            'phone_wa' => $this->phone_wa,
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
            'is_active' => $this->is_active,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'village' => new VillageResource($this->whenLoaded('village')),
            'hamlet' => new HamletResource($this->whenLoaded('hamlet')),
            'rt' => new RtResource($this->whenLoaded('rt')),
            'rw' => new RwResource($this->whenLoaded('rw')),
        ];
    }
}
