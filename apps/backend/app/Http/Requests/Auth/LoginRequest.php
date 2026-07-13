<?php

namespace App\Http\Requests\Auth;

use App\Models\Citizen;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nik' => ['required', 'digits:16'],
             'password' => [
            'required',
            'string',
            'min:8',
            'regex:/^[A-Z]/',
            'regex:/[0-9]/',
            ],
        ];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $citizen = Citizen::where('nik', $this->input('nik'))->first();

        if (
            !$citizen ||
            !$citizen->user ||
            !Auth::attempt([
                'email' => $citizen->user->email,
                'password' => $this->password,
            ])
        ) {
            RateLimiter::hit($this->throttleKey());

           Log::warning('Failed login attempt', [
            'nik' => $this->input('nik'),
            'ip' => $this->ip(),
            'user_agent' => $this->userAgent(),
            'time' => now()->toDateTimeString(),
            ]);

            throw ValidationException::withMessages([
                'nik' => __('auth.failed'),
            ]);
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
            'nik' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->input('nik')).'|'.$this->ip()
        );
    }
}