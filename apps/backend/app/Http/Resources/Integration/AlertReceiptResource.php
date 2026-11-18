<?php

namespace App\Http\Resources\Integration;

use App\Models\DisasterAlert;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Skema `AlertReceipt` di kontrak SIGAP: keadaan peringatan di SID setelah
 * request diproses. Tanggal ISO 8601 dengan offset zona waktu.
 *
 * @mixin DisasterAlert
 */
class AlertReceiptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'external_id' => $this->external_id,
            'status' => $this->status->value,
            'level' => $this->level->value,
            'expires_at' => $this->expires_at->toIso8601String(),
            'received_at' => $this->created_at->toIso8601String(),
        ];
    }
}
