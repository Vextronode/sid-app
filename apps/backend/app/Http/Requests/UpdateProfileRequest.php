<?php

namespace App\Http\Requests;

use App\Repositories\UserRepository;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator as ValidatorInstance;

class UpdateProfileRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->exists('username')) {
            $username = $this->input('username');

            $this->merge([
                'username' => is_string($username) ? strtolower(trim($username)) : $username,
            ]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['sometimes', 'required', 'string', 'regex:/^[a-z0-9_.]{4,30}$/'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()->getKey())],
        ];
    }

    public function withValidator(ValidatorInstance $validator): void
    {
        $validator->after(function (ValidatorInstance $validator): void {
            if (! $this->exists('username') && ! $this->exists('email')) {
                $validator->errors()->add('profile', 'Masukkan username atau email yang ingin diubah.');
            }

            if (
                $this->exists('username') &&
                ! $validator->errors()->has('username') &&
                app(UserRepository::class)->usernameExists(
                    $this->input('username'),
                    (string) $this->user()->getKey(),
                )
            ) {
                $validator->errors()->add('username', 'Username sudah digunakan.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'username.required' => 'Username wajib diisi.',
            'username.regex' => 'Username harus 4–30 karakter berupa huruf kecil, angka, titik, atau garis bawah.',
            'username.string' => 'Username harus berupa teks.',
            'email.email' => 'Format email tidak valid.',
            'email.max' => 'Email maksimal 255 karakter.',
            'email.unique' => 'Email sudah digunakan.',
        ];
    }
}
