<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'letter_type_id' => [
                'required',
                'exists:letter_types,id',
            ],

            'purpose' => [
                'required',
                'string',
                'max:500',
            ],

            'payload' => [
                'nullable',
                'array',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            'attachments' => [
                'nullable',
                'array',
            ],

            'attachments.*' => [
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:2048',
            ],
        ];
    }
}
