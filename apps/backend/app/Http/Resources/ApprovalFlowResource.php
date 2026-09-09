<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalFlowResource extends JsonResource
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
            'category_id' => $this->category_id,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'steps' => FlowStepResource::collection($this->whenLoaded('steps')),
        ];
    }
}
