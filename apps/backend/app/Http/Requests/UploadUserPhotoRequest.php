<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UploadUserPhotoRequest extends FormRequest
{
    /**
     * Siapa yang boleh mengubah foto diperiksa di UserPhotoService.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120', 'dimensions:ratio=1/1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.required' => 'Foto profil wajib diunggah.',
            'photo.image' => 'Foto profil harus berupa gambar.',
            'photo.mimes' => 'Foto profil harus berformat PNG, JPG, atau WEBP.',
            'photo.max' => 'Ukuran foto profil maksimal 5 MB.',
            'photo.dimensions' => 'Foto profil harus persegi (1:1). Potong foto lewat tombol unggah di aplikasi.',
        ];
    }
}
