<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateNewsRequest extends FormRequest
{
    /**
     * UC-19. Aktor HANYA Staf SIDUTama (SID-ARCH-SYS-001 S2.3).
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
     * Normalisasi is_published sebelum divalidasi - klien (form-data,
     * query string) sering mengirim "true"/"false" sebagai teks, yang
     * ditolak rule `boolean` bawaan Laravel (cuma menerima true/false/0/1/"0"/"1").
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
            'title' => ['sometimes', 'string', 'max:200'],
            'content' => ['sometimes', 'string'],
            'is_published' => ['sometimes', 'boolean'],
            'thumbnail' => ['nullable', 'image', 'max:2048'],
            // `sometimes`: PATCH publish/unpublish tidak mengirim kategori.
            'category_ids' => ['sometimes', 'required', 'array', 'min:1', 'max:2'],
            'category_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('news_categories', 'id')->where('village_id', $this->user()?->village_id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return StoreNewsRequest::categoryMessages();
    }
}
