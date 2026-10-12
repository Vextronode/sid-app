<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SignatureRequestResource extends JsonResource
{
    /**
     * Ringkasan surat untuk pemilik NIK yang diminta tanda tangannya:
     * cukup untuk memutuskan terima/tolak, tanpa membuka isi surat lain.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slot_label' => $this->slot_label,
            'letter_type' => $this->letter?->letterType?->name,
            'applicant_name' => $this->letter?->applicant_name,
            'purpose' => $this->letter?->purpose,
            'requested_at' => $this->created_at,
            'expires_at' => $this->expires_at,
        ];
    }
}
