<?php

namespace App\Http\Resources\Integration;

use App\Models\CitizenBusiness;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Skema `SellerApplication` di kontrak Cimart
 * (docs/thirdparty/cimart/api-spec/openapi.yaml). Terpisah dari
 * CitizenBusinessResource supaya perubahan endpoint internal tidak merusak
 * kontrak. Tanggal ISO 8601 dengan offset zona waktu.
 *
 * @mixin CitizenBusiness
 */
class SellerApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'business_ref' => $this->id,
            'status' => $this->cimart_status?->value,
            'requested_at' => $this->cimart_requested_at?->toIso8601String(),
            'decided_at' => $this->cimart_decided_at?->toIso8601String(),
            'note' => $this->cimart_note,
            'nik' => $this->citizen?->nik,
            // Nama terbaru dari data kependudukan, bukan salinan saat SKU terbit.
            'name' => $this->citizen?->name,
            'business_name' => $this->business_name,
            'business_activity' => $this->business_activity,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'letter_number' => $this->letter?->letter_number,
            'issued_at' => $this->letter?->processed_at?->toIso8601String(),
            'expires_at' => $this->letter?->expires_at?->toIso8601String(),
        ];
    }
}
