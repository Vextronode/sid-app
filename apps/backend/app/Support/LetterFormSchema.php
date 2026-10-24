<?php

namespace App\Support;

use App\Models\LetterType;
use App\Models\Occupation;
use Illuminate\Validation\Rule;

/**
 * Membaca definisi isian form sebuah tipe surat (letter_types.form_fields)
 * dan menurunkannya menjadi aturan validasi. Definisi diset developer
 * lewat seeder; nama isian sama dengan nama placeholder di template.
 */
class LetterFormSchema
{
    public const FIELD_TYPES = ['text', 'textarea', 'date', 'number', 'nik', 'select', 'file', 'occupation'];

    /**
     * Nilai isian pekerjaan bila pemohon memilih "Lainnya"; teksnya dikirim
     * di isian pendamping <nama>_lainnya.
     */
    public const OTHER_OCCUPATION = 'lainnya';

    /** @var array<int, array<string, mixed>>|null */
    private ?array $fields;

    private ?string $villageId;

    public function __construct(?LetterType $letterType)
    {
        $this->fields = $letterType?->form_fields;
        $this->villageId = $letterType?->village_id;
    }

    /**
     * Tipe surat tanpa definisi (null) menerima isian bebas berupa teks;
     * tipe surat dengan definisi hanya menerima isian yang terdaftar.
     */
    public function isDefined(): bool
    {
        return $this->fields !== null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function valueFields(): array
    {
        return array_values(array_filter(
            $this->fields ?? [],
            fn (array $field): bool => ($field['type'] ?? 'text') !== 'file',
        ));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function fileFields(): array
    {
        return array_values(array_filter(
            $this->fields ?? [],
            fn (array $field): bool => ($field['type'] ?? 'text') === 'file',
        ));
    }

    /**
     * Aturan berkas untuk isian bertipe file. `accept: image` membatasi
     * ke gambar (mis. foto usaha); selain itu PDF juga diterima.
     *
     * @param  array<string, mixed>  $field
     * @return array<int, string>
     */
    public static function fileRules(array $field): array
    {
        $mimes = ($field['accept'] ?? null) === 'image' ? 'jpg,jpeg,png' : 'pdf,jpg,jpeg,png';

        return ['file', "mimes:{$mimes}", 'max:2048'];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function occupationFields(): array
    {
        return array_values(array_filter(
            $this->fields ?? [],
            fn (array $field): bool => ($field['type'] ?? 'text') === 'occupation',
        ));
    }

    /**
     * @return array<int, string>
     */
    public function valueFieldNames(): array
    {
        return array_column($this->valueFields(), 'name');
    }

    /**
     * Isian pekerjaan disimpan sebagai teks siap cetak: id katalog diganti
     * nama pekerjaannya, teks "Lainnya" dirapikan. Teks ini hanya untuk
     * surat; katalog dan data warga tidak berubah.
     *
     * @param  array<string, mixed>|null  $payload  payload yang sudah tervalidasi
     * @return array<string, mixed>|null
     */
    public function resolveOccupations(?array $payload): ?array
    {
        $fields = $this->occupationFields();

        if ($payload === null || $fields === []) {
            return $payload;
        }

        $catalog = Occupation::query()
            ->where('village_id', $this->villageId)
            ->where('is_active', true)
            ->pluck('name', 'id')
            ->all();

        foreach ($fields as $field) {
            $name = $field['name'];
            $other = $payload["{$name}_lainnya"] ?? null;
            unset($payload["{$name}_lainnya"]);

            $value = $payload[$name] ?? null;

            if ($value === null || $value === '') {
                continue;
            }

            $payload[$name] = (string) $value === self::OTHER_OCCUPATION
                ? OccupationName::normalize((string) $other, array_values($catalog))
                : $catalog[(int) $value];
        }

        return $payload;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function payloadRules(): array
    {
        if (! $this->isDefined()) {
            return [
                'payload' => ['nullable', 'array'],
                'payload.*' => ['nullable', 'string', 'max:2000'],
            ];
        }

        $allowed = [
            ...$this->valueFieldNames(),
            ...array_map(fn (array $field): string => "{$field['name']}_lainnya", $this->occupationFields()),
        ];
        $rules = [
            'payload' => [
                $this->hasRequiredValueField() ? 'required' : 'nullable',
                'array',
                function (string $attribute, mixed $value, \Closure $fail) use ($allowed): void {
                    $unknown = array_diff(array_keys((array) $value), $allowed);

                    if ($unknown !== []) {
                        $fail('Isian tidak dikenal untuk jenis surat ini: '.implode(', ', $unknown).'.');
                    }
                },
            ],
        ];

        foreach ($this->valueFields() as $field) {
            $rules["payload.{$field['name']}"] = [
                ($field['required'] ?? false) ? 'required' : 'nullable',
                ...self::typeRules($field),
            ];
        }

        foreach ($this->occupationFields() as $field) {
            $rules["payload.{$field['name']}"] = [
                ($field['required'] ?? false) ? 'required' : 'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ((string) $value === self::OTHER_OCCUPATION) {
                        return;
                    }

                    $exists = ctype_digit((string) $value) && Occupation::query()
                        ->where('village_id', $this->villageId)
                        ->where('is_active', true)
                        ->whereKey((int) $value)
                        ->exists();

                    if (! $exists) {
                        $fail(':attribute tidak ada di daftar pekerjaan.');
                    }
                },
            ];
            $rules["payload.{$field['name']}_lainnya"] = [
                "required_if:payload.{$field['name']},".self::OTHER_OCCUPATION,
                'nullable',
                'string',
                'max:100',
            ];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function attributeLabels(): array
    {
        $labels = [];

        foreach ($this->fields ?? [] as $field) {
            $labels["payload.{$field['name']}"] = $field['label'] ?? $field['name'];
            $labels["files.{$field['name']}"] = $field['label'] ?? $field['name'];
        }

        foreach ($this->occupationFields() as $field) {
            $labels["payload.{$field['name']}_lainnya"] = ($field['label'] ?? $field['name']).' (Lainnya)';
        }

        return $labels;
    }

    /**
     * @param  array<string, mixed>  $field
     * @return array<int, mixed>
     */
    public static function typeRules(array $field): array
    {
        return match ($field['type'] ?? 'text') {
            'textarea' => ['string', 'max:2000'],
            'date' => ['date'],
            'number' => ['numeric'],
            'nik' => ['digits:16'],
            'select' => ['string', Rule::in(array_column($field['options'] ?? [], 'value'))],
            default => ['string', 'max:255'],
        };
    }

    private function hasRequiredValueField(): bool
    {
        foreach ($this->valueFields() as $field) {
            if ($field['required'] ?? false) {
                return true;
            }
        }

        return false;
    }
}
