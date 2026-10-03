<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $username = $this->input('username');

        $this->merge([
            'username' => is_string($username) ? Str::lower(trim($username)) : $username,
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string'],
            'password' => [
                'required',
                'string',
            ],
        ];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $user = User::where('username', $this->input('username'))->first();

        if (
            ! $user ||
            ! Auth::attempt([
                'username' => $this->input('username'),
                'password' => $this->password,
            ])
        ) {
            RateLimiter::hit($this->throttleKey());

            Log::warning('Failed login attempt', [
                'username' => $this->input('username'),
                'ip' => $this->ip(),
                'user_agent' => $this->userAgent(),
                'time' => now()->toDateTimeString(),
            ]);

            throw ValidationException::withMessages([
                'username' => __('auth.failed'),
            ]);
        }

        if (! Auth::user()->is_active) {
            Auth::guard('web')->logout();
            RateLimiter::clear($this->throttleKey());

            abort(403, 'Akun tidak aktif, hubungi administrator');
        }

        RateLimiter::clear($this->throttleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'username' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->input('username')).'|'.$this->ip()
        );
    }
}
