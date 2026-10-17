<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Satu perubahan status surat (letter_status_logs) untuk halaman Log
 * Aktivitas; berbeda dari LetterStatusLogResource yang menempel di
 * detail satu surat.
 */
class LetterActivityLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'letter' => $this->letter ? [
                'id' => $this->letter->id,
                'letter_number' => $this->letter->letter_number,
                'applicant_name' => $this->letter->applicant_name,
                'letter_type' => $this->letter->letterType?->name,
            ] : null,
            'actor' => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'role' => $this->actor->role,
                'role_label' => UserRole::tryFrom((string) $this->actor->role)?->label(),
            ] : null,
            'old_status' => $this->old_status?->value,
            'new_status' => $this->new_status?->value,
            'reason' => $this->reason,
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at,
        ];
    }
}
