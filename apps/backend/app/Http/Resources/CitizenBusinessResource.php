<?php

namespace App\Http\Resources;

use App\Enums\CimartApplicationStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CitizenBusinessResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $letterExpired = (bool) $this->letter?->isExpired();
        $isOwner = $this->citizen_id !== null && $request->user()?->citizen_id === $this->citizen_id;

        return [
            'id' => $this->id,
            'business_name' => $this->business_name,
            'business_activity' => $this->business_activity,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'address' => $this->address,
            'email' => $this->email,
            'phone' => $this->phone,
            'citizen' => $this->whenLoaded('citizen', fn () => $this->citizen ? [
                'id' => $this->citizen->id,
                'name' => $this->citizen->name,
            ] : null),
            'letter' => $this->whenLoaded('letter', fn () => $this->letter ? [
                'id' => $this->letter->id,
                'letter_number' => $this->letter->letter_number,
                'expires_at' => $this->letter->expires_at,
            ] : null),
            // Dihitung dari letters.expires_at: berlaku | kedaluwarsa.
            'letter_status' => $letterExpired ? 'kedaluwarsa' : 'berlaku',
            'cimart_status' => $this->cimart_status?->value,
            'cimart_status_label' => $this->cimart_status?->label() ?? 'Belum mendaftar',
            'cimart_note' => $this->cimart_note,
            'cimart_requested_at' => $this->cimart_requested_at,
            'cimart_decided_at' => $this->cimart_decided_at,
            'cimart_cancelled_at' => $this->cimart_cancelled_at,
            // Tombol di Usaha Saya; aturan yang sama ditegakkan CitizenBusinessService.
            'can_request_cimart' => $this->when($isOwner, fn () => ! $letterExpired && ! in_array(
                $this->cimart_status,
                [CimartApplicationStatus::Pending, CimartApplicationStatus::Accepted],
                true,
            )),
            'can_cancel_cimart' => $this->when($isOwner, fn () => $this->cimart_status === CimartApplicationStatus::Pending),
            'created_at' => $this->created_at,
        ];
    }
}
