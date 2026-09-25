<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterStatsResource extends JsonResource
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
            'chart' => [
                'labels' => array_values($this->resource['chart']['labels']),
                'values' => array_map('intval', $this->resource['chart']['values']),
                'maxY' => (int) $this->resource['chart']['maxY'],
            ],
        ];
    }
}
