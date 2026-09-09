<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterTypeResource extends JsonResource
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
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'template' => $this->template,
            'verification_type' => $this->verification_type,
            'requirement_info' => $this->requirement_info,
            'category_id' => $this->category_id,
            'flow_id' => $this->flow_id,
            'assigned_role' => $this->assigned_role,
            'validity_days' => $this->validity_days,
            'is_active' => $this->is_active,
        ];
    }
}
