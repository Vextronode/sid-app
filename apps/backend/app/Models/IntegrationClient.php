<?php

namespace App\Models;

use App\Enums\IntegrationAbility;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Sanctum\HasApiTokens;

/**
 * Aplikasi pihak ketiga yang memanggil /api/integrations/v1 dengan bearer
 * token miliknya sendiri, bukan milik user SID. Guard `integration` hanya
 * menerima token model ini, dan guard `sanctum` (route internal) menolaknya.
 * Dikelola lewat IntegrationClientService.
 */
class IntegrationClient extends Model implements AuthenticatableContract
{
    use Authenticatable, HasApiTokens, HasFactory, HasUuids;

    protected $fillable = [
        'village_id',
        'slug',
        'name',
        'abilities',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'abilities' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Village, $this> */
    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    /**
     * Ability yang dikenali saja, sesuai urutan enum.
     *
     * @return list<IntegrationAbility>
     */
    public function abilityEnums(): array
    {
        return array_values(array_filter(
            IntegrationAbility::cases(),
            fn (IntegrationAbility $ability) => in_array($ability->value, $this->abilities ?? [], true),
        ));
    }

    /** Client tidak punya kata sandi; hanya token. */
    public function getAuthPassword(): string
    {
        return '';
    }

    /** Client tidak punya sesi "ingat saya". */
    public function getRememberTokenName(): string
    {
        return '';
    }
}
