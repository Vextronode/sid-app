<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Satu entri tab "Lainnya" di Log Aktivitas: pejabat, buka NIK di surat,
 * data usaha (Cimart), peringatan bencana, dan klien integrasi. Pelaku bisa
 * pengguna, klien integrasi, atau sistem.
 */
class OtherLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $properties = collect($this->properties ?? []);
        $role = $this->causer?->getAttribute('role');

        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'event' => $this->event,
            'description' => $this->description,
            'subject_label' => $properties->get('subject_label'),
            // Rincian lain apa adanya (tanpa kunci internal).
            'details' => (object) $properties->except(['village_id', 'subject_label'])->all(),
            'actor' => $this->causer ? [
                'id' => (string) $this->causer->getKey(),
                'name' => $this->causer->getAttribute('name'),
                'role' => $role,
                'role_label' => $role ? UserRole::tryFrom((string) $role)?->label() : 'Klien integrasi',
            ] : null,
            'created_at' => $this->created_at,
        ];
    }
}
