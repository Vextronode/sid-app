<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    /**
     * Otorisasi peran sudah ditegakkan middleware `role:petugas_desa`
     * di routes/api.php (grup 'users').
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', Rule::in([
                'rt', 'rw', 'kadus', 'kasi_pelayanan', 'kaur_tu_umum',
                'petugas_desa', 'kepala_desa', 'sekretaris_desa',
            ])],
            'citizen_id' => ['required', 'exists:citizens,id'],

            'position_data' => ['nullable', 'array'],
            'position_data.position' => ['required_with:position_data', Rule::in([
                'kepala_desa', 'kasi_pelayanan', 'kaur_tu_umum', 'kadus',
                'petugas_desa', 'rw', 'rt', 'sekdes', 'kasi_kesejahteraan',
                'kasi_pemerintahan', 'kaur_perencanaan', 'kaur_keuangan',
                'staf_sipades', 'staf_siskeudes',
            ])],
            'position_data.rt_id' => ['nullable', 'exists:rts,id'],
            'position_data.rw_id' => ['nullable', 'exists:rws,id'],
            'position_data.hamlet_id' => ['nullable', 'exists:hamlets,id'],
            'position_data.started_at' => ['required_with:position_data', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'Email sudah digunakan',
            'citizen_id.exists' => 'Data kependudukan tidak ditemukan',
        ];
    }
}
