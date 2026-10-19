<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Ringkasan surat selalu dihitung atas seluruh scope role; satu-satunya
 * parameter yang berpengaruh adalah scope=mine (surat milik sendiri).
 */
class LetterSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scope' => ['nullable', 'in:mine'],
        ];
    }
}
