<?php

namespace App\Http\Requests;

use App\Models\Rt;
use App\Support\AreaNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRtRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    /** Nomor dinormalkan dulu ("1" -> "001") supaya cek unik membandingkan format yang sama. */
    protected function prepareForValidation(): void
    {
        if ($this->has('number')) {
            $this->merge(['number' => AreaNumber::normalize($this->input('number'))]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Rt $rt */
        $rt = $this->route('rt');

        return [
            'number' => [
                'bail',
                'sometimes',
                'string',
                AreaNumber::RULE,
                Rule::unique('rts')->where(fn ($q) => $q->where('rw_id', $rt->rw_id))->ignore($rt->id),
            ],
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'number.regex' => 'Nomor RT harus angka 1 sampai 999.',
            'number.unique' => 'RT dengan nomor ini sudah ada di RW tersebut.',
        ];
    }
}
