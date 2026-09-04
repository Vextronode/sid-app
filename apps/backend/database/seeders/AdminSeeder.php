<?php

namespace Database\Seeders;

use app\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            [
                'email' => 'admin@desa.test',
            ],
            [
                'name' => 'Administrator Desa',
                'username' => 'admin',
                'role' => 'petugas_desa',
                'password' => Hash::make('password'),
                'is_active' => true,
                'email_verified_at' => now(),
                'village_id' => null,
                'citizen_id' => null,
            ]
        );
    }
}
