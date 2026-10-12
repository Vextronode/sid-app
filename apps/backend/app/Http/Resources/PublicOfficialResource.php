<?php

namespace App\Http\Resources;

use App\Support\OfficialPositionCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PublicOfficialResource extends JsonResource
{
    /**
     * Perangkat desa untuk halaman publik Profil Desa: hanya nama,
     * jabatan, dan foto - tanpa kontak maupun identitas kependudukan.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'position' => $this->position,
            'position_label' => app(OfficialPositionCatalog::class)->label($this->position, $this->village_id),
            'name' => $this->citizen?->name,
            'hamlet_id' => $this->hamlet_id,
            'hamlet_name' => $this->hamlet?->name,
            'photo_url' => $this->photo_img ? Storage::disk('public')->url($this->photo_img) : null,
        ];
    }
}
