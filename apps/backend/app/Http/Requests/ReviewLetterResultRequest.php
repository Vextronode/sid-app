<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Verifikasi hasil unggahan; hak verifikasi diperiksa LetterPolicy::reviewResult.
 */
class ReviewLetterResultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('notes'))) {
            $this->merge(['notes' => trim($this->input('notes'))]);
        }
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:accepted,rejected'],
            'notes' => ['nullable', 'required_if:decision,rejected', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'notes.required_if' => 'Tuliskan alasan penolakan agar pemohon dapat memperbaiki unggahannya.',
        ];
    }
}
