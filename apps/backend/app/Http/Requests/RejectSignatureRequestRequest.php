<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectSignatureRequestRequest extends FormRequest
{
    /**
     * Hanya pemilik NIK yang dituju yang dapat menolak; diperiksa di
     * LetterSignatureService.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],
            // Ikut memblokir pemohon agar tidak dapat meminta lagi.
            'block' => ['nullable', 'boolean'],
        ];
    }
}
