<?php

namespace App\Http\Resources;

use App\Models\Village;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VillageResource extends JsonResource
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
            'name' => $this->name,
            'code' => $this->code,
            'head_name' => $this->head_name,
            'address' => $this->address,
            'phone' => $this->phone,
            'district' => $this->district,
            'regency' => $this->regency,
            'province' => $this->province,
            'postal_code' => $this->postal_code,
            'email' => $this->email,
            'area_ha' => $this->area_ha,
            'logo_url' => Village::mediaUrl($this->logo),
            'hero_image_url' => Village::mediaUrl($this->hero_image),
            'hero_photo_credit' => $this->hero_photo_credit,
            'office_hours' => $this->office_hours,
            'welcome_message' => $this->welcome_message,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'history' => $this->history,
            'vision' => $this->vision,
            'mission' => $this->mission,
        ];
    }
}
