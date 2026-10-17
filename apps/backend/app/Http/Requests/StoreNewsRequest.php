<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class StoreNewsRequest extends FormRequest
{
    /**
     * UC-19. Aktor HANYA Petugas Desa (SID-ARCH-SYS-001 S2.3).
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang berwenang.');
    }

    /**
     * Normalisasi is_published sebelum divalidasi - request ini wajib
     * multipart/form-data (upload thumbnail), jadi is_published selalu
     * datang sebagai teks ("true"/"false"), yang ditolak rule `boolean`
     * bawaan Laravel (cuma menerima true/false/0/1/"0"/"1").
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('is_published')) {
            $this->merge([
                'is_published' => filter_var($this->input('is_published'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'content' => ['required', 'string'],
            'thumbnail' => ['nullable', 'image', 'max:2048'],
            'is_published' => ['nullable', 'boolean'],
            'category_ids' => ['required', 'array', 'min:1', 'max:2'],
            'category_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('news_categories', 'id')->where('village_id', $this->user()?->village_id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul berita wajib diisi',
            'content.required' => 'Konten berita wajib diisi',
            ...self::categoryMessages(),
        ];
    }

    /**
     * Dipakai juga oleh UpdateNewsRequest.
     *
     * @return array<string, string>
     */
    public static function categoryMessages(): array
    {
        return [
            'category_ids.required' => 'Pilih minimal 1 kategori berita.',
            'category_ids.min' => 'Pilih minimal 1 kategori berita.',
            'category_ids.max' => 'Pilih maksimal 2 kategori berita.',
            'category_ids.*.distinct' => 'Kategori yang sama tidak boleh dipilih dua kali.',
            'category_ids.*.exists' => 'Kategori berita tidak ditemukan.',
        ];
    }
}
