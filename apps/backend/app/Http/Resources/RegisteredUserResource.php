<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegisteredUserResource extends JsonResource
{
    /**
     * Keep the registration response limited to the credentials the new user needs.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'username' => $this->username,
        ];
    }
}
