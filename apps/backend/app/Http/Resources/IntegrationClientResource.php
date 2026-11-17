<?php

namespace App\Http\Resources;

use App\Enums\IntegrationAbility;
use App\Models\IntegrationClient;
use App\Models\PersonalAccessToken;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Client integrasi untuk menu Integrasi. Nilai token tidak pernah ada di
 * sini; hanya metadata token (nama, waktu dibuat, terakhir dipakai).
 *
 * @mixin IntegrationClient
 */
class IntegrationClientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $tokens = $this->whenLoaded('tokens', fn () => $this->tokens->sortByDesc('created_at')->values());

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'abilities' => array_map(fn (IntegrationAbility $ability) => [
                'value' => $ability->value,
                'label' => $ability->label(),
            ], $this->abilityEnums()),
            'last_used_at' => $this->whenLoaded('tokens', fn () => $this->tokens->max('last_used_at')?->toIso8601String()),
            'tokens' => $this->whenLoaded('tokens', fn () => $tokens->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'created_at' => $token->created_at?->toIso8601String(),
                'last_used_at' => $token->last_used_at?->toIso8601String(),
            ])->all()),
        ];
    }
}
