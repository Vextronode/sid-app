<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LetterIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scope' => ['nullable', 'in:mine'],
            'status' => ['nullable', 'string'],

            'letter_type_id' => [
                'nullable',
                'exists:letter_types,id',
            ],

            'from' => [
                'nullable',
                'date',
            ],

            'to' => [
                'nullable',
                'date',
                'after_or_equal:from',
            ],

            // Rentang waktu persis (ISO 8601 dengan zona waktu), berbeda
            // dari from/to yang hanya membandingkan tanggal dalam UTC.
            'submitted_from' => ['nullable', 'date'],
            'submitted_to' => ['nullable', 'date', 'after_or_equal:submitted_from'],

            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],

            'applicant_name' => [
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }
}
