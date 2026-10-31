<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Status permintaan yang dilihat pengaju (belum login) lewat token
 * klaimnya. Sengaja minim: hanya yang dibutuhkan halaman lupa kata sandi.
 */
class PasswordResetRequestStatusResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->effectiveStatus(),
            'name' => $this->user?->name,
            'username' => $this->user?->username,
            'created_at' => $this->created_at,
            'approved_until' => $this->isClaimable() ? $this->approved_until : null,
            'response_notes' => $this->response_notes,
        ];
    }
}
