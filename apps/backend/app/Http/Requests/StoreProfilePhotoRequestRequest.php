<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Permintaan ganti foto profil oleh warga. Siapa yang boleh meminta
 * diperiksa di ProfilePhotoRequestService.
 */
class StoreProfilePhotoRequestRequest extends FormRequest
{
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
            // Kamera-saja ditegakkan di frontend; server memastikan
            // berkasnya gambar persegi (dipotong 1:1, 1080 px di aplikasi).
            'photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120', 'dimensions:ratio=1/1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.required' => 'Ambil foto wajah Anda dengan kamera.',
            'photo.image' => 'Foto tidak valid. Ambil ulang dengan kamera.',
            'photo.mimes' => 'Foto tidak valid. Ambil ulang dengan kamera.',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
            'photo.dimensions' => 'Foto harus persegi (1:1). Ambil ulang dan atur fotonya di aplikasi.',
        ];
    }
}
