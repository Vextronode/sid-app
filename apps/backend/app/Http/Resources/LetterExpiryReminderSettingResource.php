<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterExpiryReminderSettingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'days_before' => $this->days_before,
            'is_active' => $this->is_active,
            'activated_at' => $this->activated_at,
        ];
    }
}
