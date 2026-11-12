<?php

namespace App\Http\Resources;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class CitizenBusinessCollection extends ResourceCollection
{
    /**
     * @return array<int|string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => CitizenBusinessResource::collection($this->collection),
            // Untuk daftar berpaginasi ini jumlah seluruh hasil, bukan jumlah baris halaman.
            'total' => $this->resource instanceof LengthAwarePaginator
                ? $this->resource->total()
                : count($this->collection),
        ];
    }
}
