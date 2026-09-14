<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOfficialRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'citizen_id' => [
                'sometimes',
                'exists:citizens,id',
            ],

            'user_id' => [
                'sometimes',
                'nullable',
                'exists:users,id',
            ],

            'position' => [
                'sometimes',
                'string',
                'in:kepala_desa,rt,rw,kadus,kasi_pelayanan,kaur_tu_umum,petugas_desa,sekdes,kasi_kesejahteraan,kasi_pemerintahan,kaur_perencanaan,kaur_keuangan,staf_sipades,staf_siskeudes',
            ],

            'village_id' => [
                'sometimes',
                'nullable',
                'exists:villages,id',
            ],

            'rt_id' => [
                'sometimes',
                'nullable',
                'exists:rts,id',
            ],

            'rw_id' => [
                'sometimes',
                'nullable',
                'exists:rws,id',
            ],

            'hamlet_id' => [
                'sometimes',
                'nullable',
                'exists:hamlets,id',
            ],

            'phone_wa' => [
                'sometimes',
                'nullable',
                'string',
                'max:20',
            ],

            'started_at' => [
                'sometimes',
                'date',
            ],

            'ended_at' => [
                'sometimes',
                'nullable',
                'date',
                'after_or_equal:started_at',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            'notes' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ];
    }
}
