<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicContactResource extends JsonResource
{
    /**
     * UC-16. wa_link diturunkan dari phone_wa (format internasional
     * tanpa '+', mis. "6281234567890"), bukan kolom tersendiri.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'position' => $this->position,
            'name' => $this->citizen?->name,
            'phone_wa' => $this->phone_wa,
            'wa_link' => $this->phone_wa ? "https://wa.me/{$this->phone_wa}" : null,
        ];
    }
}
