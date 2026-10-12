<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Kategori berita per desa, dikelola Petugas Desa.
 */
class NewsCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'village_id',
        'name',
        'slug',
    ];

    public function village(): BelongsTo
    {
        return $this->belongsTo(Village::class);
    }

    public function news(): BelongsToMany
    {
        return $this->belongsToMany(News::class, 'news_category_news');
    }
}
