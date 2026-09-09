<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class NewsResource extends JsonResource
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
            'author_id' => $this->author_id,
            'author_name' => $this->whenLoaded('author', fn () => $this->author->name),
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'thumbnail' => $this->thumbnail ? Storage::disk('public')->url($this->thumbnail) : null,
            'is_published' => $this->is_published,
            'published_at' => $this->published_at,
        ];
    }
}
