<?php

namespace App\Http\Resources;

use App\Models\DisasterAlert;
use Illuminate\Http\Request;

/**
 * Peringatan bencana untuk tab Peringatan SIGAP (Staf SIDUTama): isi publik
 * ditambah sumber, status, dan data penurunan.
 *
 * @mixin DisasterAlert
 */
class DisasterAlertResource extends PublicDisasterAlertResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'external_id' => $this->external_id,
            'status' => $this->status->value,
            'source' => $this->whenLoaded('integrationClient', fn () => $this->integrationClient?->name),
            'sent_at' => $this->sent_at->toIso8601String(),
            'received_at' => $this->created_at->toIso8601String(),
            'dismissed_at' => $this->dismissed_at?->toIso8601String(),
            'dismissed_by' => $this->whenLoaded('dismissedBy', fn () => $this->dismissedBy ? [
                'id' => $this->dismissedBy->id,
                'name' => $this->dismissedBy->name,
            ] : null),
            'dismiss_reason' => $this->dismiss_reason,
        ];
    }
}
