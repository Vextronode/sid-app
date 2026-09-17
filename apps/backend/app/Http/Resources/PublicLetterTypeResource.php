<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicLetterTypeResource extends JsonResource
{
    /**
     * UC-16. Sengaja TIDAK menampilkan id/category_id/flow_id - irrelevan
     * untuk publik, beda dari LetterTypeResource versi terautentikasi.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
            'requirements_info' => $this->requirement_info,
        ];
    }
}
