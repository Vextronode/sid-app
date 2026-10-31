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

    /**
     * Isian yang diturunkan dari data pemohon (mis. peran suami/istri dari
     * jenis kelamin) menimpa jawaban form sebelum divalidasi.
     */
    protected function prepareForValidation(): void
    {
        if (is_array($this->input('payload'))) {
            $this->merge(['payload' => $this->schema()->withApplicantValues($this->input('payload'))]);
        }
    }

    public function rules(): array
    {
        $schema = $this->schema();
        $payload = is_array($this->input('payload')) ? $this->input('payload') : [];

        $rules = [
            'letter_type_id' => [
                'required',
                'exists:letter_types,id',
            ],

            // Berkas hanya untuk isian bertipe file pada definisi tipe surat
            // (mis. foto usaha); tidak ada lampiran bebas.
            'files' => [
                'nullable',
                'array',
            ],

            ...$schema->payloadRules($payload),
        ];

        $visible = $schema->visibleFieldNames($payload);

        foreach ($schema->fileFields() as $field) {
            if (! in_array($field['name'], $visible, true)) {
                $rules["files.{$field['name']}"] = ['exclude'];

                continue;
            }

            $rules["files.{$field['name']}"] = [
                ($field['required'] ?? false) ? 'required' : 'nullable',
                ...LetterFormSchema::fileRules($field),
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

        return $this->schema = new LetterFormSchema($letterType, $this->user()?->citizen);
    }
}
