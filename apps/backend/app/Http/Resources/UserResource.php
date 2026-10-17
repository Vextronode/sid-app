<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
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
            'citizen_id' => $this->citizen_id,
            'name' => $this->name,
            'username' => $this->username,
            'role' => $this->role,
            'role_label' => UserRole::tryFrom((string) $this->role)?->label(),
            // Foto akun warga. Akun yang menjabat memakai official.photo_img.
            'photo_url' => $this->photo_img ? Storage::disk('public')->url($this->photo_img) : null,
            'email' => $this->email,
            // NIK utuh hanya untuk pemilik akun sendiri; orang lain hanya
            // mendapat citizen.nik_masked.
            'nik' => $this->when(
                $request->user()?->is($this->resource),
                fn () => $this->citizen?->nik,
            ),
            'is_active' => $this->is_active,
            'must_change_password' => $this->must_change_password,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'official' => new OfficialResource($this->whenLoaded('official')),
        ];
    }
}
