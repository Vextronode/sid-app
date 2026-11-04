<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

/**
 * POST /citizens/import: langsung dari `file`, atau dari hasil preview
 * (`token` + `overwrite_rows`, baris yang dipilih "Timpa").
 */
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => ['bail', 'required_without:token', 'prohibits:token', ...self::fileRules()],
            'token' => ['required_without:file', 'string', 'uuid'],
            'overwrite_rows' => ['nullable', 'array', 'prohibits:file'],
            'overwrite_rows.*' => ['integer', 'min:1'],
        ];
    }

    /**
     * File pemutakhiran data pemilih desa berformat .xlsb (Excel Binary) yang
     * tidak dapat dibaca PhpSpreadsheet: ditolak dengan petunjuk konversi,
     * bukan pesan format umum.
     *
     * @return list<ValidationRule|Closure|string>
     */
    public static function fileRules(): array
    {
        return [
            'file',
            function (string $attribute, mixed $value, Closure $fail) {
                if ($value instanceof UploadedFile && strtolower($value->getClientOriginalExtension()) === 'xlsb') {
                    $fail(self::XLSB_MESSAGE);
                }
            },
            'mimes:xlsx,csv,xls',
            'max:'.self::MAX_KB,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required_without' => 'File impor wajib diunggah.',
            'file.mimes' => 'Format file harus .xlsx, .xls, atau .csv',
            'file.max' => 'Ukuran file maksimal '.(self::MAX_KB / 1024).' MB.',
        ];
    }
}
