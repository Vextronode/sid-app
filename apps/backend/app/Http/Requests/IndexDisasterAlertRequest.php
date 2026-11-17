<?php

namespace App\Http\Requests;

use App\Services\DisasterAlertService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexDisasterAlertRequest extends FormRequest
{
    /** Hanya Staf SIDUTama (middleware route); data dibatasi ke desanya. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::in([
                DisasterAlertService::LIST_DISPLAYED,
                DisasterAlertService::LIST_DISMISSED,
            ])],
        ];
    }

    public function listStatus(): string
    {
        return (string) ($this->validated('status') ?? DisasterAlertService::LIST_DISPLAYED);
    }
}
