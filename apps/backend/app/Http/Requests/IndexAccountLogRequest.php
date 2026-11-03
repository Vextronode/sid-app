<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Otorisasi peran ditegakkan middleware `role:staf_sid` di routes/api.php.
 */
class IndexAccountLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event' => ['nullable', Rule::in([
                'activated', 'deactivated', 'updated', 'password_reset_by_staff', 'staf_sid_recovered',
                'approved', 'rejected',
                'registration_approved', 'registration_rejected', 'registration_manual_activated',
            ])],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
