<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class NewPasswordController extends Controller
{
    /**
     * Handle an incoming new password request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Here we will attempt to reset the user's password. If it is successful we
        // will update the password on an actual user model and persist it to the
        // database. Otherwise we will parse the error and return the response.
        $status = Password::reset(
            [
                ...$request->only('email', 'password', 'password_confirmation', 'token'),
                'is_active' => true,
            ],
            function ($user) use ($request) {
                // Kata sandi dibuat sendiri oleh pemilik akun, jadi tidak
                // perlu lagi dipaksa ganti (mis. sisa reset sementara admin).
                $user->forceFill([
                    'password' => Hash::make($request->string('password')),
                    'remember_token' => Str::random(60),
                    'must_change_password' => false,
                ])->save();

                // Cabut akses lama: siapa pun yang memegang token API akun
                // ini sebelum reset harus login ulang.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status != Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['status' => __($status)]);
    }
}
