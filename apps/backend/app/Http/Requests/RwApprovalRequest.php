<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RwApprovalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'decision' => 'required|in:approved,rejected',
            'notes' => 'nullable|string|max:500',
        ];
    }
}