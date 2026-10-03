<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterNumberCounter extends Model
{
    protected $fillable = [
        'village_id',
        'letter_type_id',
        'year',
        'last_number',
    ];
}
