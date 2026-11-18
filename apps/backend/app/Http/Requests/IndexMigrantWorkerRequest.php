<?php

namespace App\Http\Requests;

use App\Repositories\MigrantWorkerRepository;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexMigrantWorkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'destination_country' => ['nullable', 'string', 'max:100'],
            'contract_status' => ['nullable', Rule::in(MigrantWorkerRepository::CONTRACT_STATUSES)],
            'hamlet_id' => ['nullable', 'integer', 'min:1'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
