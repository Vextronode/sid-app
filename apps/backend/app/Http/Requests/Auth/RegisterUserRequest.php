<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nik' => ['required', 'string', 'digits:16'],
            'password' => ['required', 'confirmed', Password::defaults()],
            // Foto wajah dari kamera untuk diperiksa petugas pemegang aktivasi
            // (D1/K4). Kamera-saja ditegakkan di frontend; server memastikan
            // berkasnya gambar persegi (dipotong 1:1, 1080 px di aplikasi).
            'photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120', 'dimensions:ratio=1/1'],
        ];
    }

    public function messages(): array
    {
        return [
            'nik.digits' => 'NIK harus 16 digit angka.',
            'nik.required' => 'NIK wajib diisi.',
            'nik.string' => 'NIK harus berupa teks.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'password' => 'Kata sandi tidak memenuhi persyaratan keamanan.',
            'photo.required' => 'Ambil foto wajah Anda dengan kamera.',
            'photo.image' => 'Foto tidak valid. Ambil ulang dengan kamera.',
            'photo.mimes' => 'Foto tidak valid. Ambil ulang dengan kamera.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
            'photo.dimensions' => 'Foto harus persegi (1:1). Ambil ulang dan atur fotonya di aplikasi.',
        ];
    }
}
