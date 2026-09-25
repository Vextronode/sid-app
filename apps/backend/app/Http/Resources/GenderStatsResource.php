<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GenderStatsResource extends JsonResource
{
    public static $wrap = null;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'total' => (int) $this->resource['total'],
            'laki' => (int) $this->resource['laki'],
            'perempuan' => (int) $this->resource['perempuan'],
        ];
    }
}
