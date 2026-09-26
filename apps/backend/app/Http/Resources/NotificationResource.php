<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['id'],
            'title' => $this->resource['title'],
            'message' => $this->resource['message'],
            'category' => $this->resource['category'],
            'icon' => $this->resource['icon'],
            'color' => $this->resource['color'],
            'status' => $this->resource['status'],
            'letter_id' => $this->resource['letter_id'],
            'letter_no' => $this->resource['letter_no'],
            'applicant' => $this->resource['applicant'],
            'read' => $this->resource['read'],
            'created_at' => $this->resource['created_at'],
            'time' => $this->resource['time'],
        ];
    }
}
