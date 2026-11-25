<?php

namespace App\Http\Requests;

use App\Support\AreaNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRwRequest extends FormRequest
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
        /** @var Rw $rw */
        $rw = $this->route('rw');

        return [
            'number' => [
                'bail',
                'sometimes',
                'string',
                AreaNumber::RULE,
                // Nomor RW urut se-desa, tidak mulai lagi di tiap dusun.
                Rule::unique('rws')->where('village_id', $rw->village_id)->ignore($rw->id),
            ],
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'number.regex' => 'Nomor RW harus angka 1 sampai 999.',
            'number.unique' => 'RW dengan nomor ini sudah ada di desa ini.',
        ];
    }
}
