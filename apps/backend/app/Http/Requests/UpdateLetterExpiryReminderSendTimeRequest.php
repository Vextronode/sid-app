<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\Village;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateLetterExpiryReminderSendTimeRequest extends FormRequest
{
    private const EDITABLE_FIELDS = ['send_at'];

    /** Jam kirim pengingat masa berlaku surat: khusus Staf SIDUTama. */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang berwenang.');
    }

    /**
     * Hanya jam bulat dalam rentang yang ditawarkan di kartu pengaturan
     * (Village::expiryReminderSendTimeOptions()).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'send_at' => ['required', 'string', Rule::in(Village::expiryReminderSendTimeOptions())],
        ];
    }

    public function messages(): array
    {
        return [
            'send_at.required' => 'Jam kirim wajib diisi.',
            'send_at.in' => sprintf(
                'Jam kirim harus jam bulat antara %02d.00 dan %02d.00.',
                Village::EXPIRY_REMINDER_EARLIEST_HOUR,
                Village::EXPIRY_REMINDER_LATEST_HOUR,
            ),
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
