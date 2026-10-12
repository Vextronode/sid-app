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
            'id' => $this->resource['id'] ?? null,
            'type' => $this->resource['type'] ?? null,
            'title' => $this->resource['title'] ?? null,
            'message' => $this->resource['message'] ?? null,
            'category' => $this->resource['category'] ?? 'umum',
            'icon' => $this->resource['icon'] ?? 'bell',
            'color' => $this->resource['color'] ?? 'gray',
            'read' => $this->resource['read'] ?? false,
            'created_at' => $this->resource['created_at'] ?? null,
            'time' => $this->resource['time'] ?? null,
            'context' => $this->resource['context'] ?? [],
        ];
    }
}
