<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpsertFamilySocioeconomicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['staf_sid', 'kasi_pemerintahan'], true);
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' dan Kasi Pemerintahan yang berwenang.');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'household_income_range' => ['nullable', 'string', 'in:<1jt,1-3jt,3-5jt,5-10jt,>10jt'],
            'house_ownership_status' => ['nullable', 'string', 'in:milik_sendiri,sewa,menumpang,dinas'],
            'water_source' => ['nullable', 'string', 'in:pdam,sumur,sungai,lainnya'],
            'electricity_source' => ['nullable', 'string', 'in:pln,non_pln,tidak_ada'],
            'dependents_count' => ['nullable', 'integer', 'min:0'],
            'productive_assets' => ['nullable', 'array'],
        ];
    }
}
