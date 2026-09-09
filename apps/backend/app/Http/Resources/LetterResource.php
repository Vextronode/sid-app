<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterResource extends JsonResource
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
            'village_id' => $this->village_id,
            'letter_type_id' => $this->letter_type_id,
            'submitted_by' => $this->submitted_by,
            'on_behalf_of' => $this->on_behalf_of,
            'citizen_id' => $this->citizen_id,
            'letter_number' => $this->letter_number,
            'applicant_name' => $this->applicant_name,
            'applicant_nik' => $this->applicant_nik,
            'applicant_address' => $this->applicant_address,
            'purpose' => $this->purpose,
            'payload' => $this->payload,
            'notes' => $this->notes,
            'status' => $this->status,
            'revision_count' => $this->revision_count,
            'is_overdue' => $this->is_overdue,
            'expires_at' => $this->expires_at,
            'submitted_at' => $this->submitted_at,
            'processed_at' => $this->processed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'letter_type' => new LetterTypeResource($this->whenLoaded('letterType')),
            'approvals' => LetterApprovalResource::collection($this->whenLoaded('approvals')),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
