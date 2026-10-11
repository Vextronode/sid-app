<?php

namespace App\Http\Requests;

use App\Enums\OfficialPosition;
use App\Models\Official;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RotateOfficialRequest extends FormRequest
{
    /**
     * Otorisasi diperiksa lewat OfficialPolicy::update() di controller
     * (konsisten dengan PATCH /officials/{id}).
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
        // Pengganti mengikuti jenis jabatan lama: akun warga untuk jabatan
        // yang punya akun, data warga untuk jabatan tanpa akun.
        $old = $this->route('official');
        $needsAccount = ! $old instanceof Official || OfficialPosition::tryFrom($old->position) !== null;

        return [
            'user_id' => [Rule::requiredIf($needsAccount), 'nullable', 'exists:users,id'],
            'citizen_id' => [Rule::requiredIf(! $needsAccount), 'nullable', 'exists:citizens,id'],
            'started_at' => ['required', 'date'],
            'term_ends_at' => ['nullable', 'date', 'after:started_at'],
            'phone_wa' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'photo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'user_id.required' => 'Akun target wajib dipilih.',
            'user_id.exists' => 'Akun sistem tidak ditemukan',
            'citizen_id.required' => 'Warga target wajib dipilih.',
            'citizen_id.exists' => 'Data warga target tidak ditemukan.',
            'started_at.required' => 'Tanggal mulai wajib diisi.',
            'term_ends_at.after' => 'Akhir masa jabatan harus setelah tanggal mulai.',
            'phone_wa.max' => 'Nomor WhatsApp maksimal 20 karakter.',
            'photo.required' => 'Foto pejabat wajib diunggah.',
            'photo.image' => 'Foto pejabat harus berupa gambar.',
            'photo.mimes' => 'Foto pejabat harus berformat PNG, JPG, atau WEBP.',
            'photo.max' => 'Ukuran foto pejabat maksimal 5 MB.',
        ];
    }
}
