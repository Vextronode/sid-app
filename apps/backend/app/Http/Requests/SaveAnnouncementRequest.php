<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Services\AnnouncementService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SaveAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang dapat mengelola pengumuman');
    }

    /**
     * Durasi (angka + satuan) wajib saat membuat; saat mengubah boleh
     * dikosongkan untuk mempertahankan waktu berakhir (dicek di service).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'body' => ['nullable', 'string', 'max:1000'],
            // URL https:// lengkap atau path internal seperti /berita/12.
            'link_url' => ['nullable', 'string', 'max:500', 'regex:#^(https://[^\s]+|/[^\s/][^\s]*)$#'],
            'duration_value' => ['nullable', 'required_with:duration_unit', 'integer', 'min:1', 'max:999'],
            'duration_unit' => ['nullable', 'required_with:duration_value', Rule::in(array_keys(AnnouncementService::UNITS))],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul pengumuman wajib diisi',
            'title.max' => 'Judul pengumuman paling banyak 150 karakter',
            'body.max' => 'Isi pengumuman paling banyak 1000 karakter',
            'link_url.regex' => 'Link harus diawali https:// atau berupa alamat halaman situs ini, mis. /berita/12',
            'duration_value.required_with' => 'Isi lama tayang pengumuman',
            'duration_value.integer' => 'Lama tayang harus berupa angka bulat',
            'duration_value.min' => 'Lama tayang minimal 1',
            'duration_unit.required_with' => 'Pilih satuan lama tayang (jam, hari, atau minggu)',
            'duration_unit.in' => 'Satuan lama tayang harus jam, hari, atau minggu',
        ];
    }
}
