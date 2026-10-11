<?php

namespace App\Http\Requests;

use App\Models\LetterType;
use App\Support\LetterFormSchema;
use Illuminate\Foundation\Http\FormRequest;

class StoreLetterRequest extends FormRequest
{
    private const FILE_RULES = ['file', 'mimes:pdf,jpg,jpeg,png', 'max:2048'];

    private ?LetterFormSchema $schema = null;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $schema = $this->schema();

        $rules = [
            'letter_type_id' => [
                'required',
                'exists:letter_types,id',
            ],

            'purpose' => [
                'required',
                'string',
                'max:500',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            // Lampiran umum (dokumen pendukung yang diunggah warga).
            'attachments' => [
                'nullable',
                'array',
                'max:5',
            ],

            'attachments.*' => self::FILE_RULES,

            // Berkas untuk isian bertipe file pada definisi tipe surat.
            'files' => [
                'nullable',
                'array',
            ],

            // Penanda tangan pihak lain per slot: `nik` untuk tanda tangan
            // digital, atau `name` + signature_files.{slot} untuk TTD basah.
            // Kelengkapan per slot diperiksa LetterSignatureService.
            'signers' => [
                'nullable',
                'array',
            ],

            'signers.*.nik' => [
                'nullable',
                'digits:16',
            ],

            'signers.*.name' => [
                'nullable',
                'string',
                'max:100',
            ],

            'signature_files' => [
                'nullable',
                'array',
            ],

            'signature_files.*' => self::FILE_RULES,

            ...$schema->payloadRules(),
        ];

        foreach ($schema->fileFields() as $field) {
            $rules["files.{$field['name']}"] = [
                ($field['required'] ?? false) ? 'required' : 'nullable',
                ...self::FILE_RULES,
            ];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->schema()->attributeLabels();
    }

    /**
     * Definisi isian mengikuti tipe surat yang dipilih, dibatasi ke desa
     * pemohon agar tipe surat desa lain tidak dapat dipakai.
     */
    private function schema(): LetterFormSchema
    {
        if ($this->schema !== null) {
            return $this->schema;
        }

        $letterTypeId = $this->input('letter_type_id');
        $letterType = is_scalar($letterTypeId)
            ? LetterType::query()
                ->where('village_id', $this->user()?->village_id)
                ->find($letterTypeId)
            : null;

        return $this->schema = new LetterFormSchema($letterType);
    }
}
