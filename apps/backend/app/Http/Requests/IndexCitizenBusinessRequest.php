<?php

namespace App\Http\Requests;

use App\Enums\BusinessCategory;
use App\Enums\CimartApplicationStatus;
use App\Repositories\CitizenBusinessRepository;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexCitizenBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::enum(BusinessCategory::class)],
            'letter_status' => ['nullable', Rule::in(['berlaku', 'kedaluwarsa'])],
            'cimart_status' => ['nullable', Rule::in([
                CitizenBusinessRepository::CIMART_NOT_REGISTERED,
                ...array_column(CimartApplicationStatus::cases(), 'value'),
            ])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
