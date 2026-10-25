<?php

namespace App\Support;

use App\Enums\FamilyRole;
use App\Models\Citizen;
use App\Models\LetterType;
use App\Models\Occupation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\Rule;

/**
 * Membaca definisi isian form sebuah tipe surat (letter_types.form_fields)
 * dan menurunkannya menjadi aturan validasi. Definisi diset developer
 * lewat seeder; nama isian sama dengan nama placeholder di template.
 *
 * Isian boleh punya `visible_when` (bentuk FieldCondition), mis. kolom
 * paspor hanya untuk WNA. Isian yang tersembunyi tidak wajib, tidak
 * divalidasi, dan nilainya dibuang. Syarat dinilai berurutan terhadap
 * isian yang tampil saja, jadi isian yang bergantung pada isian
 * tersembunyi ikut tersembunyi.
 *
 * Isian berulang:
 *  - `repeater`: baris yang bisa ditambah pemohon (mis. daftar anak), dengan
 *    sub-isian di `fields` serta `min`/`max`. Sub-isian boleh punya
 *    `visible_when` yang dinilai per baris.
 *  - `family_members`: anggota KK pemohon yang dicentang; disimpan sebagai
 *    baris siap cetak (nama, NIK, SHDK, ...) saat pengajuan.
 * Keduanya dicetak lewat blok {{#each nama_isian}} (TemplateLoops).
 */
class LetterFormSchema
{
    public const FIELD_TYPES = ['text', 'textarea', 'date', 'number', 'nik', 'select', 'file', 'occupation', 'repeater', 'family_members'];

    /** Tipe sub-isian di dalam repeater. */
    public const ROW_FIELD_TYPES = ['text', 'textarea', 'date', 'number', 'nik', 'select'];

    /** Kolom tiap baris family_members yang dapat dipakai di template. */
    public const FAMILY_MEMBER_KEYS = ['nama', 'nik', 'shdk', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir'];

    private const REPEATER_MAX_ROWS = 20;

    /**
     * Nilai isian pekerjaan bila pemohon memilih "Lainnya"; teksnya dikirim
     * di isian pendamping <nama>_lainnya.
     */
    public const OTHER_OCCUPATION = 'lainnya';

    /** @var array<int, array<string, mixed>>|null */
    private ?array $fields;

    private ?string $villageId;

    /** @var Collection<int, Citizen>|null */
    private ?Collection $familyMembers = null;

    /**
     * @param  Citizen|null  $applicant  pemohon; sumber pilihan isian family_members
     */
    public function __construct(?LetterType $letterType, private readonly ?Citizen $applicant = null)
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
     * Anggota KK pemohon yang dapat dipilih di isian family_members: warga
     * aktif dengan KK yang sama; tanpa KK, hanya pemohon sendiri.
     *
     * @return Collection<int, Citizen>
     */
    public function familyMembers(): Collection
    {
        if ($this->familyMembers !== null) {
            return $this->familyMembers;
        }

        if ($this->applicant === null) {
            return $this->familyMembers = new Collection;
        }

        return $this->familyMembers = $this->applicant->family_id === null
            ? new Collection([$this->applicant])
            : Citizen::query()
                ->where('village_id', $this->applicant->village_id)
                ->where('family_id', $this->applicant->family_id)
                ->where('is_active', true)
                ->orderBy('date_of_birth')
                ->get();
    }

    /**
     * Pilihan family_members (id warga) disimpan sebagai baris siap cetak
     * agar surat tidak berubah bila data warga diperbarui kemudian.
     *
     * @param  array<string, mixed>|null  $payload  payload yang sudah tervalidasi
     * @return array<string, mixed>|null
     */
    public function resolveFamilyMembers(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        foreach ($this->fieldsOfType('family_members') as $field) {
            $ids = (array) ($payload[$field['name']] ?? []);

            if ($ids === []) {
                continue;
            }

            $members = $this->familyMembers()->keyBy('id');
            $payload[$field['name']] = array_values(array_map(function (string $id) use ($members): array {
                $member = $members[$id];

                return [
                    'citizen_id' => $member->id,
                    'nama' => $member->name,
                    'nik' => $member->nik,
                    'shdk' => self::familyRoleLabel($member->family_role),
                    'jenis_kelamin' => match ($member->gender) {
                        'L' => 'Laki-laki',
                        'P' => 'Perempuan',
                        default => '-',
                    },
                    'tempat_lahir' => $member->place_of_birth ?? '-',
                    'tanggal_lahir' => $member->date_of_birth?->locale('id')->translatedFormat('j F Y') ?? '-',
                ];
            }, $ids));
        }

        return $payload;
    }

    public static function familyRoleLabel(mixed $role): string
    {
        $role = $role instanceof FamilyRole ? $role : FamilyRole::tryFrom((string) $role);

        return $role?->label() ?? '-';
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
     * Nama isian (termasuk bertipe file) yang tampil untuk jawaban ini.
     *
     * @param  array<string, mixed>  $payload
     * @return array<int, string>
     */
    public function visibleFieldNames(array $payload): array
    {
        $visible = [];
        $answers = [];

        foreach ($this->fields ?? [] as $field) {
            if (! FieldCondition::matches($field['visible_when'] ?? null, $answers)) {
                continue;
            }

            $visible[] = $field['name'];

            if (array_key_exists($field['name'], $payload)) {
                $answers[$field['name']] = $payload[$field['name']];
            }
        }

        return $visible;
    }

    /**
     * Buang nilai isian yang tersembunyi agar tidak tersimpan dan tercetak.
     *
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>|null
     */
    public function visiblePayload(?array $payload): ?array
    {
        if ($payload === null || ! $this->isDefined()) {
            return $payload;
        }

        $hidden = array_diff(array_column($this->fields ?? [], 'name'), $this->visibleFieldNames($payload));

        foreach ($hidden as $name) {
            unset($payload[$name], $payload["{$name}_lainnya"]);
        }

        // Sub-isian yang tersembunyi di sebuah baris ikut dibuang.
        foreach ($this->fieldsOfType('repeater') as $field) {
            if (! is_array($payload[$field['name']] ?? null)) {
                continue;
            }

            $payload[$field['name']] = array_values(array_map(
                fn (mixed $row): array => array_intersect_key(
                    is_array($row) ? $row : [],
                    array_flip(self::visibleRowFieldNames($field, is_array($row) ? $row : [])),
                ),
                $payload[$field['name']],
            ));
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload  jawaban yang dikirim, untuk menilai `visible_when`
     * @return array<string, array<int, mixed>>
     */
    public function payloadRules(array $payload = []): array
    {
        if (! $this->isDefined()) {
            return [
                'payload' => ['nullable', 'array'],
                'payload.*' => ['nullable', 'string', 'max:2000'],
            ];
        }

        $visible = $this->visibleFieldNames($payload);
        $allowed = [
            ...$this->valueFieldNames(),
            ...array_map(fn (array $field): string => "{$field['name']}_lainnya", $this->occupationFields()),
        ];
        $rules = [
            'payload' => [
                $this->hasRequiredValueField($visible) ? 'required' : 'nullable',
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
            // Isian tersembunyi tidak divalidasi dan tidak ikut validated().
            if (! in_array($field['name'], $visible, true)) {
                $rules["payload.{$field['name']}"] = ['exclude'];

                continue;
            }

            if (($field['type'] ?? 'text') === 'repeater') {
                $rules = [...$rules, ...$this->repeaterRules($field, $payload[$field['name']] ?? null)];

                continue;
            }

            if (($field['type'] ?? 'text') === 'family_members') {
                $rules = [...$rules, ...$this->familyMemberRules($field)];

                continue;
            }

            $rules["payload.{$field['name']}"] = [
                ($field['required'] ?? false) ? 'required' : 'nullable',
                ...self::typeRules($field),
            ];
        }

        foreach ($this->occupationFields() as $field) {
            if (! in_array($field['name'], $visible, true)) {
                $rules["payload.{$field['name']}_lainnya"] = ['exclude'];

                continue;
            }

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
     * Sub-isian sebuah baris repeater yang tampil untuk jawaban baris itu.
     *
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $row
     * @return array<int, string>
     */
    public static function visibleRowFieldNames(array $field, array $row): array
    {
        $visible = [];
        $answers = [];

        foreach ($field['fields'] ?? [] as $subField) {
            if (! FieldCondition::matches($subField['visible_when'] ?? null, $answers)) {
                continue;
            }

            $visible[] = $subField['name'];

            if (array_key_exists($subField['name'], $row)) {
                $answers[$subField['name']] = $row[$subField['name']];
            }
        }

        return $visible;
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

            foreach ($field['fields'] ?? [] as $subField) {
                $labels["payload.{$field['name']}.*.{$subField['name']}"] = $subField['label'] ?? $subField['name'];
            }
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

    /**
     * @param  array<string, mixed>  $field
     * @return array<string, array<int, mixed>>
     */
    private function repeaterRules(array $field, mixed $rows): array
    {
        $name = $field['name'];
        $required = (bool) ($field['required'] ?? false);
        $min = (int) ($field['min'] ?? ($required ? 1 : 0));
        $max = (int) ($field['max'] ?? self::REPEATER_MAX_ROWS);
        $allowed = array_column($field['fields'] ?? [], 'name');

        $rules = [
            "payload.{$name}" => [
                $min > 0 ? 'required' : 'nullable',
                'array',
                ...($min > 0 ? ["min:{$min}"] : []),
                "max:{$max}",
            ],
            "payload.{$name}.*" => [
                'array',
                function (string $attribute, mixed $value, \Closure $fail) use ($allowed): void {
                    if (array_diff(array_keys((array) $value), $allowed) !== []) {
                        $fail('Baris :attribute berisi isian yang tidak dikenal.');
                    }
                },
            ],
        ];

        // Aturan per baris menurut jawaban baris itu (sub-isian bersyarat).
        foreach (is_array($rows) ? $rows : [] as $index => $row) {
            $row = is_array($row) ? $row : [];
            $visible = self::visibleRowFieldNames($field, $row);

            foreach ($field['fields'] ?? [] as $subField) {
                $rules["payload.{$name}.{$index}.{$subField['name']}"] = in_array($subField['name'], $visible, true)
                    ? [($subField['required'] ?? false) ? 'required' : 'nullable', ...self::typeRules($subField)]
                    : ['exclude'];
            }
        }

        return $rules;
    }

    /**
     * @param  array<string, mixed>  $field
     * @return array<string, array<int, mixed>>
     */
    private function familyMemberRules(array $field): array
    {
        $name = $field['name'];
        $required = (bool) ($field['required'] ?? false);
        $memberIds = $this->familyMembers()->pluck('id')->map(fn ($id): string => (string) $id)->all();

        return [
            "payload.{$name}" => [$required ? 'required' : 'nullable', 'array', ...($required ? ['min:1'] : [])],
            "payload.{$name}.*" => ['distinct', 'string', Rule::in($memberIds)],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fieldsOfType(string $type): array
    {
        return array_values(array_filter(
            $this->fields ?? [],
            fn (array $field): bool => ($field['type'] ?? 'text') === $type,
        ));
    }

    /**
     * @param  array<int, string>  $visible
     */
    private function hasRequiredValueField(array $visible): bool
    {
        foreach ($this->valueFields() as $field) {
            if (($field['required'] ?? false) && in_array($field['name'], $visible, true)) {
                return true;
            }
        }

        return false;
    }
}
