<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class ImportCitizensRequest extends FormRequest
{
    /** KB; sama dengan upload_max_filesize (docker/php.ini) dan IMPORT_MAX_MB di frontend. */
    public const MAX_KB = 25600;

    public const XLSB_MESSAGE = 'File .xlsb belum didukung. Buka file di Excel, pilih Simpan Sebagai (Save As) "Excel Workbook (*.xlsx)", lalu unggah file .xlsx tersebut.';

    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['staf_sid', 'kasi_pemerintahan'], true);
    }

    /**
     * File pemutakhiran data pemilih desa berformat .xlsb (Excel Binary) yang
     * tidak dapat dibaca PhpSpreadsheet: ditolak dengan petunjuk konversi,
     * bukan pesan format umum.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'bail',
                'required',
                'file',
                function (string $attribute, mixed $value, Closure $fail) {
                    if ($value instanceof UploadedFile && strtolower($value->getClientOriginalExtension()) === 'xlsb') {
                        $fail(self::XLSB_MESSAGE);
                    }
                },
                'mimes:xlsx,csv,xls',
                'max:'.self::MAX_KB,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.mimes' => 'Format file harus .xlsx, .xls, atau .csv',
            'file.max' => 'Ukuran file maksimal '.(self::MAX_KB / 1024).' MB.',
        ];
    }
}
