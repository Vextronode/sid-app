<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AcceptSignatureRequestRequest extends FormRequest
{
    /**
     * Hanya pemilik NIK yang dituju yang dapat menyetujui; diperiksa di
     * LetterSignatureService.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Menyetujui berarti tanda tangan akun dibubuhkan ke surat orang
     * lain, jadi kata sandi diminta ulang agar persetujuan tidak terjadi
     * dari sesi yang tertinggal terbuka.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'current_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => 'Masukkan kata sandi Anda untuk menyetujui.',
            'password.current_password' => 'Kata sandi tidak sesuai.',
        ];
    }
}
