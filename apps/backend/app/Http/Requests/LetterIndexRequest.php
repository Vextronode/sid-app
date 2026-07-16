<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LetterIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [

            'status' => ['nullable', 'string'],

            'letter_type_id' => [
                'nullable',
                'exists:letter_types,id'
            ],

            'from' => [
                'nullable',
                'date'
            ],

            'to' => [
                'nullable',
                'date',
                'after_or_equal:from'
            ],

            'applicant_name' => [
                'nullable',
                'string',
                'max:255'
            ],

        ];
    }
}