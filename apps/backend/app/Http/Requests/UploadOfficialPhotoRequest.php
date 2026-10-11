<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UploadOfficialPhotoRequest extends FormRequest
{
    /**
     * Otorisasi diperiksa lewat OfficialPolicy::update() di controller.
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
            'photo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.required' => 'Foto pejabat wajib diunggah.',
            'photo.image' => 'Foto pejabat harus berupa gambar.',
            'photo.mimes' => 'Foto pejabat harus berformat PNG, JPG, atau WEBP.',
            'photo.max' => 'Ukuran foto pejabat maksimal 5 MB.',
        ];
    }
}
