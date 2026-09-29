<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Village;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $village = Village::first();

        User::updateOrCreate(
            [
                'email' => 'admin@desa.test',
            ],
            [
                'name' => 'Administrator Desa',
                'username' => 'admin',
                'role' => 'petugas_desa',
                'password' => Hash::make('Password123'),
                'is_active' => true,
                'email_verified_at' => now(),
                'village_id' => $village?->id,
                'citizen_id' => null,
            ]
        );
    }
}
