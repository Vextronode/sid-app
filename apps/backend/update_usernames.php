<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$users = User::all();
foreach ($users as $user) {
    if (empty($user->username)) {
        // Generate a username based on their role or name
        if ($user->role === 'rt') {
            $user->username = 'rt_user';
        } elseif ($user->role === 'rw') {
            $user->username = 'rw_user';
        } elseif ($user->role === 'kepala_desa') {
            $user->username = 'kades';
        } elseif (in_array($user->role, ['kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa'])) {
            $user->username = 'operator';
        } elseif ($user->role === 'kadus') {
            $user->username = 'kadus';
        } else {
            // For warga, maybe just use 'warga1', 'warga2', etc. or their NIK if they have citizen_id
            if ($user->citizen) {
                // we can't easily decrypt NIK here unless we use the model's cast, which we can
                $user->username = 'warga_' . $user->id;
            } else {
                $user->username = 'user_' . $user->id;
            }
        }
        
        // Ensure uniqueness
        $baseUsername = $user->username;
        $counter = 1;
        while (User::where('username', $user->username)->where('id', '!=', $user->id)->exists()) {
            $user->username = $baseUsername . '_' . $counter;
            $counter++;
        }
        
        $user->save();
        echo "Set username for user {$user->id} ({$user->name}) to: {$user->username}\n";
    }
}

echo "Done updating usernames.\n";
