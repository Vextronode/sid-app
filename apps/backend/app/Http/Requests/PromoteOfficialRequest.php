<?php

namespace App\Http\Requests;

use App\Enums\OfficialPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PromoteOfficialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'exists:users,id'],
            'position' => ['required', Rule::in(OfficialPosition::accountPositions())],
            'rt_id' => ['required_if:position,rt', 'nullable', 'exists:rts,id'],
            'rw_id' => ['required_if:position,rw', 'nullable', 'exists:rws,id'],
            'hamlet_id' => ['required_if:position,kadus', 'nullable', 'exists:hamlets,id'],
            'started_at' => ['required', 'date'],
            'term_ends_at' => ['nullable', 'date', 'after:started_at'],
            'phone_wa' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'Akun target wajib dipilih.',
            'user_id.exists' => 'Akun target tidak ditemukan.',
            'position.required' => 'Posisi jabatan wajib dipilih.',
            'position.in' => 'Posisi jabatan tidak dapat ditetapkan ke akun.',
            'rt_id.required_if' => 'RT wajib dipilih untuk jabatan RT.',
            'rt_id.exists' => 'Data RT tidak ditemukan.',
            'rw_id.required_if' => 'RW wajib dipilih untuk jabatan RW.',
            'rw_id.exists' => 'Data RW tidak ditemukan.',
            'hamlet_id.required_if' => 'Dusun wajib dipilih untuk jabatan Kepala Dusun.',
            'hamlet_id.exists' => 'Data dusun tidak ditemukan.',
            'started_at.required' => 'Tanggal mulai wajib diisi.',
            'term_ends_at.after' => 'Akhir masa jabatan harus setelah tanggal mulai.',
            'phone_wa.max' => 'Nomor WhatsApp maksimal 20 karakter.',
        ];
    }
}
