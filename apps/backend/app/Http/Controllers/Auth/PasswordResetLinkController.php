<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetLinkController extends Controller
{
    /**
     * Handle an incoming password reset link request.
     *
     * Responsnya selalu sama, baik email terdaftar, tidak terdaftar, milik
     * akun nonaktif, maupun sedang di-throttle, supaya endpoint ini tidak
     * bisa dipakai untuk menebak email mana yang punya akun.
     *
     * @throws ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Akun nonaktif tidak boleh dipulihkan lewat email: kriteria
        // is_active ikut dipakai saat broker mencari user.
        Password::sendResetLink([
            'email' => $request->string('email')->trim()->value(),
            'is_active' => true,
        ]);

        return response()->json([
            'status' => 'Jika email tersebut terdaftar, tautan atur ulang kata sandi sudah dikirim. Periksa kotak masuk atau folder spam Anda.',
        ]);
    }
}
