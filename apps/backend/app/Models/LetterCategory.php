<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LetterCategory extends Model
{
    /** @use HasFactory<\Database\Factories\LetterCategoriesFactory> */
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'handler_class',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function flows(): HasMany
    {
        return $this->hasMany(ApprovalFlow::class, 'category_id');
    }

    public function letterTypes(): HasMany
    {
        return $this->hasMany(LetterType::class, 'category_id');
    }
}
