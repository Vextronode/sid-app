<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NewsCategoryResource extends JsonResource
{
    /**
     * news_count dan can_delete hanya ada di daftar kelola kategori;
     * kategori yang menempel di berita cukup id, name, slug.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'news_count' => $this->whenCounted('news'),
            'can_delete' => $this->whenCounted('news', fn () => (int) $this->news_count === 0),
        ];
    }
}
