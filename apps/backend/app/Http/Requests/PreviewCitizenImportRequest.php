<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * POST /citizens/import/preview: file yang sama dengan impor biasa.
 */
class PreviewCitizenImportRequest extends ImportCitizensRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => ['bail', 'required', ...self::fileRules()],
        ];
    }
}
