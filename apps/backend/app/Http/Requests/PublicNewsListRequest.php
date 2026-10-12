<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PublicNewsListRequest extends FormRequest
{
    /**
     * UC-16. Endpoint publik tanpa login - tidak ada guard role, murni
     * validasi input.
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
        return [
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
