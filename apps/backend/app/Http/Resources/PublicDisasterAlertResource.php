<?php

namespace App\Http\Resources;

use App\Models\DisasterAlert;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Peringatan bencana untuk bar merah di halaman publik. Hanya isi dari
 * SIGAP; kolom staf (siapa yang menurunkan, alasan) tidak pernah ikut.
 *
 * @mixin DisasterAlert
 */
class PublicDisasterAlertResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'level' => $this->level->value,
            'level_label' => $this->level->label(),
            'title' => $this->title,
            'message' => $this->message,
            'magnitude' => $this->magnitude,
            'depth_km' => $this->depth_km,
            'location' => $this->location,
            'link_url' => $this->link_url,
            'occurred_at' => $this->occurred_at->toIso8601String(),
            'expires_at' => $this->expires_at->toIso8601String(),
        ];
    }
}
