<?php

namespace App\Http\Resources;

use App\Models\LetterSignature;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterSignatureResource extends JsonResource
{
    /**
     * Keadaan sebuah slot tanda tangan. Nama penanda tangan hanya muncul
     * setelah slot ditandatangani; sebelum itu pemohon tidak mendapat
     * data apa pun tentang pemilik NIK yang ia tuju.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status === LetterSignature::STATUS_PENDING && $this->expires_at?->isPast()
            ? LetterSignature::STATUS_EXPIRED
            : $this->status;

        return [
            'slot_key' => $this->slot_key,
            'slot_label' => $this->slot_label,
            'signer_type' => $this->signer_type,
            'method' => $this->method,
            'status' => $status,
            'signer_name' => $status === LetterSignature::STATUS_SIGNED ? $this->signer_name : null,
            'expires_at' => $status === LetterSignature::STATUS_PENDING ? $this->expires_at : null,
            'responded_at' => $this->responded_at,
        ];
    }
}
