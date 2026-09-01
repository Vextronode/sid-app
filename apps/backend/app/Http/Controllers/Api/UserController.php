<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with([
            'citizen.rt',
            'citizen.rw',
            'official',
        ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $users,
        ]);
    }

    public function updateStatus(User $user)
    {
        $user->update([
            'is_active' => ! $user->is_active,
        ]);

        return response()->json([
            'message' => 'Status user berhasil diperbarui',
            'data' => $user,
        ]);
    }
}
