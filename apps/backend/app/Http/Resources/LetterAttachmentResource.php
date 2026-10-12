<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterAttachmentResource extends JsonResource
{
    /**
     * Path penyimpanan tidak pernah dikirim; berkas dibuka lewat `url`
     * yang memeriksa hak lihat surat.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'field' => $this->field,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'url' => "/api/letters/{$this->letter_id}/attachments/{$this->id}",
            'created_at' => $this->created_at,
        ];
    }
}
