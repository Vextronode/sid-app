<?php

namespace App\Http\Requests\Integration;

use App\Enums\CimartApplicationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSellerApplicationRequest extends FormRequest
{
    /** Akses dicek middleware `abilities:seller-applications:update`. */
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
            'status' => ['required', 'string', Rule::in([
                CimartApplicationStatus::Accepted->value,
                CimartApplicationStatus::Rejected->value,
            ])],
            // Ditampilkan ke warga di halaman Usaha Saya.
            'note' => ['nullable', 'required_if:status,'.CimartApplicationStatus::Rejected->value, 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.required' => 'Status wajib diisi.',
            'status.in' => 'Status hanya boleh accepted atau rejected.',
            'note.required_if' => 'Alasan penolakan wajib diisi.',
            'note.max' => 'Alasan penolakan maksimal 500 karakter.',
        ];
    }

    public function status(): CimartApplicationStatus
    {
        return CimartApplicationStatus::from((string) $this->validated('status'));
    }

    public function note(): ?string
    {
        $note = trim((string) $this->validated('note'));

        return $note === '' ? null : $note;
    }
}
