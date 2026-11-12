<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateLetterExpiryReminderSettingRequest extends FormRequest
{
    private const EDITABLE_FIELDS = ['is_active'];

    /** Pengaturan pengingat masa berlaku surat: khusus Staf SIDUTama. */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang berwenang.');
    }

    /**
     * Titik pengingat tetap (H-30 s.d. H-1); hanya nyala/matinya yang
     * bisa diubah.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'is_active.required' => 'Status aktif wajib diisi.',
            'is_active.boolean' => 'Status aktif harus bernilai benar atau salah.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                foreach (array_diff(array_keys($this->all()), self::EDITABLE_FIELDS) as $field) {
                    $validator->errors()->add($field, 'Field ini tidak dapat diubah.');
                }
            },
        ];
    }
}
