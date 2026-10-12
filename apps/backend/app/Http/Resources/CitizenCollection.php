<?php

namespace App\Http\Resources;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class CitizenCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     *
     * @return array<int|string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => CitizenResource::collection($this->collection),
            // Untuk daftar berpaginasi ini jumlah seluruh hasil, bukan jumlah baris halaman.
            'total' => $this->resource instanceof LengthAwarePaginator
                ? $this->resource->total()
                : count($this->collection),
        ];
    }
}
