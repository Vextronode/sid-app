<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Logo atau foto hero desa untuk halaman publik. Batas ukuran mengikuti
 * route: logo 2 MB, foto hero 5 MB.
 */
class UploadVillageImageRequest extends FormRequest
{
    public const MAX_KB = [
        'logo' => 2048,
        'hero_image' => 5120,
    ];

    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid'
            && $this->user()?->is_active
            && $this->user()?->village_id !== null;
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxKb = self::MAX_KB[$this->route('column')] ?? 2048;

        return [
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', "max:{$maxKb}"],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $maxMb = intdiv(self::MAX_KB[$this->route('column')] ?? 2048, 1024);

        return [
            'image.required' => 'Pilih gambar terlebih dahulu.',
            'image.image' => 'Berkas harus berupa gambar.',
            'image.mimes' => 'Gambar harus berformat PNG, JPG, atau WEBP.',
            'image.max' => "Ukuran gambar maksimal {$maxMb} MB.",
        ];
    }
}
