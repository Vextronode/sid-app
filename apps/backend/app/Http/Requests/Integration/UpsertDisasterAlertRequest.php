<?php

namespace App\Http\Requests\Integration;

use App\Enums\DisasterAlertLevel;
use App\Enums\DisasterAlertType;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Isi peringatan dari SIGAP (PUT /api/integrations/v1/alerts/{external_id}).
 * SID hanya memeriksa format, tidak menyaring isi. Kontrak:
 * docs/thirdparty/sigap/api-spec/openapi.yaml (AlertInput).
 */
class UpsertDisasterAlertRequest extends FormRequest
{
    /** Akses dicek middleware `abilities:alerts:write`. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(DisasterAlertType::class)],
            'level' => ['required', Rule::enum(DisasterAlertLevel::class)],
            'title' => ['required', 'string', 'max:150'],
            'message' => ['nullable', 'string', 'max:1000'],
            'occurred_at' => ['required', 'date'],
            'sent_at' => ['required', 'date'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'magnitude' => ['nullable', 'numeric', 'between:0,10'],
            'depth_km' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'location' => ['nullable', 'string', 'max:150'],
            'link_url' => ['nullable', 'string', 'max:500', 'url:https', $this->registeredSigapHost(...)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Jenis bencana wajib diisi.',
            'type.enum' => 'Jenis bencana tidak dikenal.',
            'level.required' => 'Level peringatan wajib diisi.',
            'level.enum' => 'Level peringatan tidak dikenal.',
            'title.required' => 'Judul peringatan wajib diisi.',
            'title.max' => 'Judul peringatan maksimal 150 karakter.',
            'message.max' => 'Pesan peringatan maksimal 1000 karakter.',
            'occurred_at.required' => 'Waktu kejadian wajib diisi.',
            'sent_at.required' => 'Waktu terbit peringatan (sent_at) wajib diisi.',
            'expires_at.after' => 'Masa tayang peringatan sudah lewat.',
            'magnitude.between' => 'Magnitudo harus antara 0 dan 10.',
            'link_url.url' => 'Link peringatan harus berupa alamat https.',
        ];
    }

    /** `link_url` hanya boleh mengarah ke domain SIGAP yang terdaftar. */
    private function registeredSigapHost(string $attribute, mixed $value, Closure $fail): void
    {
        $host = strtolower((string) parse_url((string) $value, PHP_URL_HOST));

        if (! in_array($host, config('disaster_alerts.link_hosts', []), true)) {
            $fail('Link peringatan harus berasal dari domain SIGAP yang terdaftar.');
        }
    }
}
