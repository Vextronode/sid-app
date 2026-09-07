<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterApprovalResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'letter_id' => $this->letter_id,
            'approved_by' => $this->approved_by,
            'approval_level' => $this->approval_level,
            'deadline_at' => $this->deadline_at,
            'reminded_at' => $this->reminded_at,
            'approved_at' => $this->approved_at,
            'approved_by_user' => new UserResource($this->whenLoaded('approvedBy')),
        ];
    }
}
