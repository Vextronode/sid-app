<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserSignatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'signature' => ['required', 'file', 'mimes:png,jpg,jpeg', 'max:512'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'signature.mimes' => 'Tanda tangan harus berupa gambar PNG atau JPG.',
            'signature.max' => 'Ukuran gambar tanda tangan maksimal 512 KB.',
        ];
    }
}
