<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegulationResource extends JsonResource
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
            'regulation_number' => $this->regulation_number,
            'title' => $this->title,
            'content' => $this->content,
            'enacted_date' => $this->enacted_date?->format('Y-m-d'),
            'created_by' => $this->created_by,
        ];
    }
}
