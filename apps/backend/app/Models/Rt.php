<?php

namespace App\Models;

use App\Support\AreaNumber;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rt extends Model
{
    use HasFactory;

    protected $fillable = [
        'number',
        'rw_id',
        'village_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * RW dan Dusun induk sebuah RT. Kolom wilayah turunan
     * (citizens.hamlet_id, families.rw_id/hamlet_id, letters.rw_id/hamlet_id)
     * diisi dari sini supaya selalu cocok dengan RT-nya.
     *
     * @return array{rw_id: ?int, hamlet_id: ?int}
     */
    public static function parentIds(int|string|null $rtId): array
    {
        $parent = $rtId === null || ! is_numeric($rtId) ? null : static::query()
            ->join('rws', 'rws.id', '=', 'rts.rw_id')
            ->where('rts.id', $rtId)
            ->first(['rts.rw_id', 'rws.hamlet_id']);

        return [
            'rw_id' => $parent !== null ? (int) $parent->rw_id : null,
            'hamlet_id' => $parent !== null ? (int) $parent->hamlet_id : null,
        ];
    }

    public function rw()
    {
        return $this->belongsTo(Rw::class);
    }

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    /** Selalu tiga digit, dari jalur mana pun (form, seeder, factory). */
    protected function number(): Attribute
    {
        return Attribute::make(set: fn (mixed $value) => AreaNumber::normalize($value));
    }
}
