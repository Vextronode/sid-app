<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\PushSubscription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filter menu Pelanggan Notifikasi. Otorisasi peran ditegakkan middleware
 * `role:staf_sid` di routes/api.php.
 */
class IndexWebPushSubscriberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::in(UserRole::values())],
            'hamlet_id' => ['nullable', 'integer'],
            'rw_id' => ['nullable', 'integer'],
            'rt_id' => ['nullable', 'integer'],
            'push_service' => ['nullable', Rule::in(PushSubscription::SERVICES)],
            'status' => ['nullable', Rule::in(PushSubscription::STATUSES)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
