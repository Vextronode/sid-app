<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class KasiApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => [
                'required',
                Rule::in([
                    'approved',
                    'rejected',
                ]),
            ],

            'notes' => [
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }
}