<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Otorisasi peran ditegakkan middleware `role:staf_sid` di routes/api.php.
 */
class IndexPopulationLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['nullable', Rule::in(['citizen', 'family'])],
            'event' => ['nullable', Rule::in(['created', 'updated', 'deleted', 'imported', 'socioeconomic_updated', 'letter_fulfilled'])],
            'subject_id' => ['nullable', 'string', 'max:36'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
