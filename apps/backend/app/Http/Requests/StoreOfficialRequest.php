<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOfficialRequest extends FormRequest
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
                'required',
                'exists:citizens,id',
            ],

            'user_id' => [
                'nullable',
                'exists:users,id',
            ],

            'position' => [
                'required',
                'string',
                'in:kepala_desa,rt,rw,kadus,kasi_pelayanan,kaur_tu_umum,petugas_desa,sekdes,kasi_kesejahteraan,kasi_pemerintahan,kaur_perencanaan,kaur_keuangan,staf_sipades,staf_siskeudes',
            ],

            'village_id' => [
                'nullable',
                'exists:villages,id',
            ],

            'rt_id' => [
                'nullable',
                'exists:rts,id',
            ],

            'rw_id' => [
                'nullable',
                'exists:rws,id',
            ],

            'hamlet_id' => [
                'nullable',
                'exists:hamlets,id',
            ],

            'phone_wa' => [
                'nullable',
                'string',
                'max:20',
            ],

            'started_at' => [
                'required',
                'date',
            ],

            'ended_at' => [
                'nullable',
                'date',
                'after_or_equal:started_at',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            'notes' => [
                'nullable',
                'string',
            ],
        ];
    }
}
