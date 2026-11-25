<?php

namespace App\Http\Requests;

use App\Repositories\ActivityLogRepository;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Tab "Lainnya" di Log Aktivitas. Otorisasi peran ditegakkan middleware
 * `role:staf_sid` di routes/api.php.
 */
class IndexOtherLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['nullable', Rule::in(ActivityLogRepository::OTHER_LOG_NAMES)],
            // Nama aksi berbeda per jenis log; cukup dibatasi bentuknya.
            'event' => ['nullable', 'string', 'max:50', 'regex:/^[a-z_]+$/'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
