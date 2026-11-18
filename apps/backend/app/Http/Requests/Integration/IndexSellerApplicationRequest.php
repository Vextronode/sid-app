<?php

namespace App\Http\Requests\Integration;

use App\Enums\CimartApplicationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexSellerApplicationRequest extends FormRequest
{
    /** Akses dicek middleware `abilities:seller-applications:read`. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `cancelled` tidak bisa difilter: permohonan yang dibatalkan warga
     * tidak pernah dikembalikan ke Cimart.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::in([
                CimartApplicationStatus::Pending->value,
                CimartApplicationStatus::Accepted->value,
                CimartApplicationStatus::Rejected->value,
            ])],
            'since' => ['sometimes', 'date'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
