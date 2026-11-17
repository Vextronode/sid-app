<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

class PersonalAccessToken extends SanctumPersonalAccessToken
{
    use HasUuids;

    /**
     * Token berbentuk `{id}|{rahasia}` dengan `id` UUID. Sanctum hanya
     * memeriksa format id bila key-nya integer, jadi id yang bukan UUID
     * (token rusak atau tebakan) akan sampai ke `find()` dan membuat
     * PostgreSQL error (respons 500). Token seperti itu dianggap tidak
     * valid tanpa query, sehingga dijawab 401.
     *
     * @param  string  $token
     * @return static|null
     */
    public static function findToken($token)
    {
        if (str_contains($token, '|') && ! Str::isUuid(explode('|', $token, 2)[0])) {
            return null;
        }

        return parent::findToken($token);
    }
}
