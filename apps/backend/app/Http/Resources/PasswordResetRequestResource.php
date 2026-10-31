<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Baris daftar permintaan atur ulang kata sandi untuk Staf SIDUTama.
 * Data wilayah dan 4 digit akhir NIK membantu staf memastikan identitas
 * pengaju (mis. lewat telepon/tatap muka) sebelum menyetujui.
 */
class PasswordResetRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->effectiveStatus(),
            'requester_ip' => $this->requester_ip,
            'created_at' => $this->created_at,
            'handled_at' => $this->handled_at,
            'approved_until' => $this->approved_until,
            'completed_at' => $this->completed_at,
            'response_notes' => $this->response_notes,
            'handler' => $this->whenLoaded('handler', fn () => $this->handler === null ? null : [
                'id' => $this->handler->id,
                'name' => $this->handler->name,
            ]),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'username' => $this->user->username,
                'role' => $this->user->role,
                'role_label' => UserRole::tryFrom((string) $this->user->role)?->label(),
                'has_email' => filled($this->user->email),
                'nik_masked' => $this->maskedNik(),
                'rt' => $this->user->citizen?->rt?->number,
                'rw' => $this->user->citizen?->rt?->rw?->number,
                'hamlet' => $this->user->citizen?->hamlet?->name,
            ]),
        ];
    }

    private function maskedNik(): ?string
    {
        $nik = $this->user->citizen?->nik;

        return $nik ? str_repeat('*', 12).substr($nik, -4) : null;
    }
}
