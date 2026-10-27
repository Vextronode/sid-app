<?php

namespace App\Support;

use App\Enums\BloodType;
use App\Enums\FamilyRole;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\LetterType;
use App\Models\Occupation;
use App\Models\Rt;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
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
 *
 * Isian `family_member`: satu anggota KK pemohon (mis. ibu bayi); saat
 * pengajuan ditambah `<nama>_<kolom>` (MEMBER_KEYS) siap cetak. `gender`
 * (L/P) membatasi pilihan, mis. ibu hanya anggota perempuan; `roles` =
 * hubungan dalam KK yang boleh dipilih (mis. hanya anak); `older_than`
 * ({field, years}) = minimal sekian tahun lebih tua dari anggota/tanggal di
 * isian itu (mis. ibu dari anak; anggota tanpa tanggal lahir tetap boleh); `not_self`
 * menolak pemohon sendiri; `different` = nama isian family_member lain yang
 * tidak boleh sama (mis. kepala keluarga baru bukan almarhum);
 * `required_when_head` = wajib bila anggota di isian itu kepala keluarga
 * (bila bukan, nilainya dibuang). Isian itu boleh family_member (mis.
 * almarhum) atau family_members (mis. anggota yang pindah); calonnya anggota
 * selain kepala keluarga dan selain yang terpilih di isian itu, dan bila
 * tidak ada calon (semua anggota terpilih) isiannya juga dibuang.
 *
 * Isian dengan `from_nik` (nama isian NIK): bila NIK itu milik warga aktif
 * desa ini, isian tidak wajib dan diisi dari data penduduk saat pengajuan
 * (`from_nik_value`: `name` = nama, bawaan; `family_number` = No. KK;
 * `occupation` = pekerjaan; `address` = alamat; `marital_status` = status
 * kawin saat pengajuan); bila
 * tidak, isian diketik (mis. saksi dari luar desa).
 *
 * Isian dengan `from_applicant` ({column, map}): nilainya diturunkan dari data
 * pemohon (mis. jenis kelamin L -> suami) dan menimpa jawaban form; hanya
 * ditanyakan bila kolom pemohon itu kosong atau tidak ada di `map`.
 *
 * Isian dengan `default`: nilai bawaan bila tidak dijawab (mis. pengurusan
 * ke Disdukcapil = sendiri); juga nilai awal di form.
 *
 * Isian dengan `same_value` ([isian a, isian b]) tidak diisi pemohon: saat
 * pengajuan bernilai `ya` bila kedua isian itu terisi dan sama (mis. No. KK
 * suami = No. KK istri), selain itu `tidak`.
 *
 * Isian tanggal dengan `date_order` ([{after|before: acuan, label}]): tidak
 * boleh sebelum (`after`) / sesudah (`before`) acuannya. Acuan = nama isian
 * tanggal, atau `birth:<isian>` = tanggal lahir orang di isian itu (anggota
 * KK, warga desa ber-NIK, pemohon bila isian NIK-nya miliknya, atau tanggal
 * yang diketik); beberapa acuan dipisah `|`, yang pertama diketahui dipakai.
 * Acuan yang tidak diketahui dilewati.
 *
 * Isian NIK `village_citizen`: harus warga aktif desa ini di luar KK
 * pemohon (mis. pasangan dari KK lain). Isian No. KK `village_family`: harus
 * KK lain di desa ini. Isian NIK `family_head_of` (nama isian No. KK) diisi
 * sistem dengan NIK kepala keluarga KK tersebut, tidak ditanyakan.
 *
 * Isian `family_roster` dengan `restructure`: susunan KK hasil perubahan
 * (F09) menurut letter_types.data_options.restructure: KK baru (baris
 * anggota + pasangan), ganti kepala, atau numpang ke KK tujuan.
 *
 * Isian pilihan SHDK dengan `role_of` (orang pemilik hubungan itu): Suami
 * harus laki-laki dan Istri harus perempuan. Acuannya nama isian
 * family_member (di repeater: kolom baris itu), isian NIK warga desa, isian
 * jenis kelamin (L/P), atau `family_head` = kepala KK pemohon sekarang. Acuan
 * yang jenis kelaminnya tidak diketahui dilewati.
 *
 * Isian NIK saksi (`witness`): bukan NIK pemohon, dan berbeda dari isian NIK
 * di `not_same_as` (saksi lainnya, pihak dalam surat).
 *
 * Isian NIK dengan `self_when` (syarat FieldCondition): bila syaratnya
 * terpenuhi, isian itu milik pemohon sendiri (mis. suami saat pemohon
 * suami). Isiannya disembunyikan di form (`visible_when` kebalikannya) dan
 * saat pengajuan diisi NIK pemohon, sehingga isian `from_nik`-nya ikut terisi
 * dari data pemohon.
 *
 * Isian `family_roster` tidak diisi pemohon: saat pengajuan sistem mencatat
 * susunan KK pemohon tanpa anggota di isian `exclude`, dengan anggota di
 * isian `head` sebagai kepala keluarga (urutan pertama). Disimpan sebagai
 * `<nama>_<n>_<kolom>` (n = 1..10, kolom MEMBER_KEYS) dan `<nama>_jumlah`,
 * mis. untuk F-1.01 setelah kepala keluarga meninggal.
 *
 * Isian `village_area`: Dusun -> RW -> RT desa ini (id RT); saat pengajuan
 * ditambah `<nama>_dusun`, `<nama>_rw`, `<nama>_rt` siap cetak.
 */
class LetterFormSchema
{
    public const FIELD_TYPES = ['text', 'textarea', 'date', 'time', 'number', 'nik', 'select', 'file', 'occupation', 'repeater', 'family_members', 'village_area', 'family_member', 'family_roster'];

    /**
     * Tipe sub-isian di dalam repeater. `family_member` memilih satu anggota
     * KK pemohon per baris (mis. anggota yang datanya berubah).
     */
    public const ROW_FIELD_TYPES = ['text', 'textarea', 'date', 'time', 'number', 'nik', 'select', 'occupation', 'family_member'];

    /**
     * Kolom turunan sub-isian family_member yang dapat dipakai di template
     * (`{{ <sub>_nama }}` dst.); nilai pendidikan/pekerjaan/agama/status
     * kawin adalah keadaan saat pengajuan ("Semula").
     */
    public const ROW_MEMBER_KEYS = ['nama', 'nik', 'shdk', 'pendidikan', 'pekerjaan', 'agama', 'status_kawin'];

    /**
     * Kolom turunan isian family_member tingkat atas: ROW_MEMBER_KEYS plus
     * data kelahiran dan alamat (`lahir_tgl/bln/thn` untuk kotak tanggal).
     */
    public const MEMBER_KEYS = [
        ...self::ROW_MEMBER_KEYS,
        'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'lahir_tgl', 'lahir_bln', 'lahir_thn', 'alamat',
        'dusun', 'rt', 'rw', 'nama_ayah', 'nama_ibu', 'golongan_darah',
        // Ayah/ibu yang tertaut di data penduduk (kosong bila tidak tertaut).
        'nik_ayah', 'tempat_lahir_ayah', 'lahir_ayah_tgl', 'lahir_ayah_bln', 'lahir_ayah_thn', 'kwn_ayah',
        'nik_ibu', 'tempat_lahir_ibu', 'lahir_ibu_tgl', 'lahir_ibu_bln', 'lahir_ibu_thn', 'kwn_ibu',
        // Dokumen & keterangan tambahan (F-1.01); akta "Ada" bila nomornya tercatat.
        'gelar_depan', 'gelar_belakang', 'akta_lahir', 'no_akta_lahir', 'akta_kawin', 'no_akta_kawin',
        'tanggal_kawin', 'akta_cerai', 'no_akta_cerai', 'tanggal_cerai', 'kelainan', 'cacat',
    ];

    /** SHDK pasangan suami istri dalam KK (kepala keluarga, suami, istri). */
    public const COUPLE_ROLES = ['kepala_keluarga', 'suami', 'istri'];

    /** Relasi yang dibaca memberValues(). */
    private const MEMBER_RELATIONS = ['occupation', 'rt.rw.hamlet', 'father', 'mother'];

    /** Jumlah baris anggota pada formulir susunan KK (F-1.01). */
    public const ROSTER_ROWS = 10;

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

    /** @var array<string, Citizen|null> warga per NIK (isian from_nik) */
    private array $nikCitizens = [];

    /** @var array<string, mixed> letter_types.data_options (mis. restructure F09) */
    private array $dataOptions;

    /**
     * @param  Citizen|null  $applicant  pemohon; sumber pilihan isian family_members
     */
    public function __construct(?LetterType $letterType, private readonly ?Citizen $applicant = null)
    {
        $this->fields = $letterType?->form_fields;
        $this->dataOptions = $letterType?->data_options ?? [];
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
     * Susunan KK hasil perubahan F09 (data_options.restructure) untuk F-1.01:
     * `<nama>_<n>_<kolom>` urut kepala keluarga dulu, `<nama>_jumlah`, dan
     * wilayah/alamat KK `<nama>_dusun/_rw/_rt/_alamat`.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function restructureRoster(string $name, array $payload): array
    {
        $config = $this->dataOptions['restructure'] ?? [];
        $kind = (string) ($payload[$config['kind'] ?? ''] ?? '');
        $relations = self::MEMBER_RELATIONS;
        $own = $this->familyMembers()->loadMissing($relations)->keyBy('id');
        $rows = [];
        $area = null;

        if ($kind === ($config['new_family']['when'] ?? null)) {
            $new = $config['new_family'];

            foreach ((array) ($payload[$new['rows']] ?? []) as $row) {
                if (isset($own[$row['anggota'] ?? ''])) {
                    $rows[] = [$own[$row['anggota']], (string) ($row['shdk'] ?? '')];
                }
            }

            $partner = $this->citizenByNik($payload[$new['partner_nik']] ?? null)?->loadMissing($relations);

            if ($partner !== null) {
                $rows[] = [$partner, (string) ($payload[$new['partner_role']] ?? '')];
            }

            $rt = isset($payload[$new['area']]) ? Rt::query()->with('rw.hamlet')->find((int) $payload[$new['area']]) : null;
            $area = $rt === null ? null : [
                'dusun' => $rt->rw?->hamlet?->name ?? '',
                'rw' => self::areaNumber($rt->rw?->number),
                'rt' => self::areaNumber($rt->number),
                'alamat' => sprintf('Dusun %s RT %s RW %s', $rt->rw?->hamlet?->name ?? '-', self::areaNumber($rt->number), self::areaNumber($rt->rw?->number)),
            ];
        } elseif ($kind === ($config['change_head']['when'] ?? null)) {
            $change = $config['change_head'];
            $newHead = (string) ($payload[$change['head']] ?? '');

            foreach ($own as $member) {
                $role = match (true) {
                    (string) $member->id === $newHead => FamilyRole::KEPALA_KELUARGA->value,
                    $member->family_role === FamilyRole::KEPALA_KELUARGA => (string) ($payload[$change['old_head_role']] ?? ''),
                    default => (string) $member->family_role?->value,
                };
                $rows[] = [$member, $role];
            }
        } elseif ($kind === ($config['join']['when'] ?? null)) {
            $join = $config['join'];
            $family = $this->familyByNumber($payload[$join['no_kk']] ?? null);

            foreach ($family?->members()->where('is_active', true)->with($relations)->orderBy('date_of_birth')->get() ?? [] as $member) {
                $rows[] = [$member, (string) $member->family_role?->value];
            }

            foreach ((array) ($payload[$join['rows']] ?? []) as $row) {
                if (isset($own[$row['anggota'] ?? ''])) {
                    $rows[] = [$own[$row['anggota']], (string) ($row['shdk'] ?? '')];
                }
            }

            $area = $family === null ? null : [
                'dusun' => $family->hamlet?->name ?? '',
                'rw' => self::areaNumber($family->rw?->number),
                'rt' => self::areaNumber($family->rt?->number),
                'alamat' => (string) $family->family_address,
            ];
        }

        // Kepala keluarga di baris pertama, sisanya menurut tanggal lahir.
        $order = fn (array $row): array => [$row[1] !== FamilyRole::KEPALA_KELUARGA->value, $row[0]->date_of_birth?->timestamp ?? 0];
        usort($rows, fn (array $a, array $b): int => $order($a) <=> $order($b));
        $rows = array_slice($rows, 0, self::ROSTER_ROWS);

        $details = $this->memberDetailValues($payload);
        $marriage = $this->newFamilyMarriage($payload);

        foreach ($rows as $index => [$member, $role]) {
            $values = [
                ...self::memberValues($member),
                'shdk' => self::familyRoleLabel($role),
                // Keluarga baru setelah menikah: kepala keluarga dan suami/istri Kawin.
                ...($marriage !== null && in_array($role, self::COUPLE_ROLES, true) ? $marriage : []),
                ...($details[(string) $member->id] ?? []),
            ];

            foreach ($values as $key => $value) {
                $payload[$name.'_'.($index + 1).'_'.$key] = $value;
            }
        }

        $head = $rows[0][0] ?? null;
        $area ??= [
            'dusun' => $head?->rt?->rw?->hamlet?->name ?? '',
            'rw' => $head?->rt?->rw ? self::areaNumber($head->rt->rw->number) : '',
            'rt' => $head?->rt ? self::areaNumber($head->rt->number) : '',
            'alamat' => (string) ($head?->address ?? ''),
        ];

        foreach ($area as $key => $value) {
            $payload["{$name}_{$key}"] = $value;
        }

        $payload["{$name}_jumlah"] = (string) count($rows);

        return $payload;
    }

    /**
     * Data tambahan anggota dari isian repeater `data_options.member_details`
     * (anggota, gelar, akta lahir/cerai, kelainan & cacat) per id anggota,
     * siap cetak (kolom MEMBER_KEYS). Hanya yang diisi yang menimpa data
     * warga; kelainan "Tidak" mengosongkan kelainan dan cacat.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, array<string, string>>
     */
    private function memberDetailValues(array $payload): array
    {
        $field = $this->dataOptions['member_details'] ?? null;
        $date = fn (mixed $value): string => is_string($value) && $value !== ''
            ? Carbon::parse($value)->locale('id')->translatedFormat('j F Y')
            : '';
        $details = [];

        foreach ($field === null ? [] : (array) ($payload[$field] ?? []) as $row) {
            if (! is_array($row) || (string) ($row['anggota'] ?? '') === '') {
                continue;
            }

            $text = fn (string $key): string => trim((string) ($row[$key] ?? ''));
            $values = array_filter([
                'gelar_depan' => $text('gelar_depan'),
                'gelar_belakang' => $text('gelar_belakang'),
                'no_akta_lahir' => $text('no_akta_lahir'),
                'akta_lahir' => $text('no_akta_lahir') !== '' ? 'Ada' : '',
                'no_akta_cerai' => $text('no_akta_cerai'),
                'akta_cerai' => $text('no_akta_cerai') !== '' ? 'Ada' : '',
                'tanggal_cerai' => $date($row['tanggal_cerai'] ?? null),
            ], fn (string $value): bool => $value !== '');

            if (in_array($row['kelainan'] ?? null, ['ada', 'tidak'], true)) {
                $values['kelainan'] = $row['kelainan'] === 'ada' ? 'Ada' : '';
                $values['cacat'] = $row['kelainan'] === 'ada' ? $text('cacat') : '';
            }

            $details[(string) $row['anggota']] = $values;
        }

        return $details;
    }

    /**
     * F09 KK baru karena membentuk keluarga baru: status Kawin dan buku
     * nikah dari isian (data_options.restructure.new_family.married).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, string>|null
     */
    private function newFamilyMarriage(array $payload): ?array
    {
        $config = $this->dataOptions['restructure'] ?? [];
        $married = $config['new_family']['married'] ?? null;

        if (! is_array($married) || (string) ($payload[$config['kind'] ?? ''] ?? '') !== ($config['new_family']['when'] ?? null)
            || ($payload[$married['field']] ?? null) !== $married['equals']) {
            return null;
        }

        $number = trim((string) ($payload[$married['certificate'] ?? ''] ?? ''));
        $date = $payload[$married['date'] ?? ''] ?? null;

        return [
            'status_kawin' => CitizenLabels::of(CitizenLabels::MARITAL_STATUS, 'kawin'),
            'akta_kawin' => $number !== '' ? 'Ada' : '',
            'no_akta_kawin' => $number,
            'tanggal_kawin' => is_string($date) && $date !== '' ? Carbon::parse($date)->locale('id')->translatedFormat('j F Y') : '',
        ];
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

        foreach ($this->fieldsOfType('family_member') as $field) {
            $id = $payload[$field['name']] ?? null;
            $member = $id ? $this->familyMembers()->loadMissing(self::MEMBER_RELATIONS)->firstWhere('id', $id) : null;

            if ($member === null) {
                continue;
            }

            foreach (self::memberValues($member) as $key => $value) {
                $payload["{$field['name']}_{$key}"] = $value;
            }
        }

        foreach ($this->fieldsOfType('family_roster') as $field) {
            if ($field['restructure'] ?? false) {
                $payload = $this->restructureRoster($field['name'], $payload);

                continue;
            }

            $excluded = (string) ($payload[$field['exclude'] ?? ''] ?? '');
            $head = (string) ($payload[$field['head'] ?? ''] ?? '');
            $members = $this->familyMembers()->loadMissing(self::MEMBER_RELATIONS)
                ->reject(fn (Citizen $member): bool => (string) $member->id === $excluded)
                ->sortBy(fn (Citizen $member): int => (string) $member->id === $head ? 0 : 1)
                ->take(self::ROSTER_ROWS)
                ->values();

            $details = $this->memberDetailValues($payload);

            foreach ($members as $index => $member) {
                $values = [...self::memberValues($member), ...($details[(string) $member->id] ?? [])];

                if ((string) $member->id === $head) {
                    $values['shdk'] = 'Kepala Keluarga';
                }

                foreach ($values as $key => $value) {
                    $payload[$field['name'].'_'.($index + 1).'_'.$key] = $value;
                }
            }

            $payload["{$field['name']}_jumlah"] = (string) $members->count();
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

    /**
     * Nilai siap cetak seorang anggota KK (MEMBER_KEYS), keadaan saat
     * pengajuan.
     *
     * @return array<string, string>
     */
    public static function memberValues(Citizen $member): array
    {
        $birth = $member->date_of_birth;
        $rt = $member->rt;
        $parent = function (string $key, ?Citizen $parent, ?string $typedName): array {
            $born = $parent?->date_of_birth;
            $name = (string) ($parent?->name ?? $typedName ?? '');

            return [
                "nama_{$key}" => $name,
                "nik_{$key}" => (string) ($parent?->nik ?? ''),
                "tempat_lahir_{$key}" => (string) ($parent?->place_of_birth ?? ''),
                "lahir_{$key}_tgl" => $born?->format('d') ?? '',
                "lahir_{$key}_bln" => $born?->format('m') ?? '',
                "lahir_{$key}_thn" => $born?->format('Y') ?? '',
                "kwn_{$key}" => $name !== '' ? 'INDONESIA' : '',
            ];
        };

        return [
            'nama' => $member->name,
            'nik' => (string) $member->nik,
            'shdk' => self::familyRoleLabel($member->family_role),
            'pendidikan' => CitizenLabels::of(CitizenLabels::LAST_EDUCATION, $member->last_education),
            'pekerjaan' => $member->occupation?->name ?? '-',
            'agama' => CitizenLabels::of(CitizenLabels::RELIGION, $member->religion),
            'status_kawin' => CitizenLabels::of(CitizenLabels::MARITAL_STATUS, $member->marital_status),
            'jenis_kelamin' => match ($member->gender) {
                'L' => 'Laki-laki',
                'P' => 'Perempuan',
                default => '-',
            },
            'tempat_lahir' => $member->place_of_birth ?? '-',
            'tanggal_lahir' => $birth?->locale('id')->translatedFormat('j F Y') ?? '-',
            'lahir_tgl' => $birth?->format('d') ?? '',
            'lahir_bln' => $birth?->format('m') ?? '',
            'lahir_thn' => $birth?->format('Y') ?? '',
            'alamat' => $member->address ?? '-',
            'dusun' => $rt?->rw?->hamlet?->name ?? '',
            'rt' => $rt ? self::areaNumber($rt->number) : '',
            'rw' => $rt?->rw ? self::areaNumber($rt->rw->number) : '',
            'golongan_darah' => match ($member->blood_type) {
                null => '',
                BloodType::TIDAK_TAHU => 'Tidak Tahu',
                default => $member->blood_type->value,
            },
            ...$parent('ayah', $member->father, $member->father_name_text),
            ...$parent('ibu', $member->mother, $member->mother_name_text),
            'gelar_depan' => (string) ($member->title_front ?? ''),
            'gelar_belakang' => (string) ($member->title_back ?? ''),
            'akta_lahir' => $member->birth_certificate_number ? 'Ada' : '',
            'no_akta_lahir' => (string) ($member->birth_certificate_number ?? ''),
            'akta_kawin' => $member->marriage_certificate_number ? 'Ada' : '',
            'no_akta_kawin' => (string) ($member->marriage_certificate_number ?? ''),
            'tanggal_kawin' => $member->marriage_date?->locale('id')->translatedFormat('j F Y') ?? '',
            'akta_cerai' => $member->divorce_certificate_number ? 'Ada' : '',
            'no_akta_cerai' => (string) ($member->divorce_certificate_number ?? ''),
            'tanggal_cerai' => $member->divorce_date?->locale('id')->translatedFormat('j F Y') ?? '',
            'kelainan' => $member->has_disorder ? 'Ada' : '',
            'cacat' => $member->has_disorder ? (string) ($member->disability ?? '') : '',
        ];
    }

    public static function familyRoleLabel(mixed $role): string
    {
        $role = $role instanceof FamilyRole ? $role : FamilyRole::tryFrom((string) $role);

        return $role?->label() ?? '-';
    }

    /**
     * Isian pekerjaan disimpan sebagai teks siap cetak: id katalog diganti
     * nama pekerjaannya, teks "Lainnya" dirapikan. Teks ini hanya untuk
     * surat; katalog dan data warga tidak berubah. Id katalognya disimpan
     * di `<nama>_id` (null untuk "Lainnya") untuk Terapkan.
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

            $isOther = (string) $value === self::OTHER_OCCUPATION;
            $payload[$name] = $isOther
                ? OccupationName::normalize((string) $other, array_values($catalog))
                : $catalog[(int) $value];
            $payload["{$name}_id"] = $isOther ? null : (int) $value;
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
                    array_flip(self::keptRowKeys($field, is_array($row) ? $row : [])),
                ),
                $payload[$field['name']],
            ));
        }

        return $payload;
    }

    /**
     * Isian wilayah disimpan beserta label siap cetaknya (keadaan saat
     * pengajuan): `<nama>_dusun`, `<nama>_rw`, `<nama>_rt` (3 digit).
     *
     * @param  array<string, mixed>|null  $payload  payload yang sudah tervalidasi
     * @return array<string, mixed>|null
     */
    public function resolveAreas(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        foreach ($this->fieldsOfType('village_area') as $field) {
            $name = $field['name'];
            $rt = isset($payload[$name]) ? Rt::query()->with('rw.hamlet')->find((int) $payload[$name]) : null;

            if ($rt === null) {
                continue;
            }

            $payload[$name] = $rt->id;
            $payload["{$name}_dusun"] = $rt->rw?->hamlet?->name ?? '-';
            $payload["{$name}_rw"] = self::areaNumber($rt->rw?->number);
            $payload["{$name}_rt"] = self::areaNumber($rt->number);
        }

        return $payload;
    }

    /**
     * Isian nama ber-`from_nik` diisi nama warga ber-NIK tersebut.
     *
     * @param  array<string, mixed>|null  $payload  payload yang sudah tervalidasi
     * @return array<string, mixed>|null
     */
    public function resolveNamesFromNik(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        foreach ($this->fields ?? [] as $field) {
            if (isset($field['self_when']) && $this->applicant !== null && FieldCondition::matches($field['self_when'], $payload)) {
                $payload[$field['name']] = $this->applicant->nik;
            }
        }

        foreach ($this->fields ?? [] as $field) {
            $fromNik = $field['from_nik'] ?? null;
            $citizen = $fromNik !== null ? $this->citizenByNik($payload[$fromNik] ?? null) : null;

            if ($citizen !== null) {
                $payload[$field['name']] = match ($field['from_nik_value'] ?? 'name') {
                    'family_number' => $citizen->family?->no_kk,
                    'occupation' => $citizen->occupation?->name,
                    'address' => $citizen->address,
                    'marital_status' => $citizen->marital_status,
                    default => $citizen->name,
                };
            }
        }

        return $payload;
    }

    /**
     * Isian `same_value`: `ya` bila kedua isian acuannya terisi dan sama.
     *
     * @param  array<string, mixed>|null  $payload  payload yang sudah lengkap (setelah resolveNamesFromNik)
     * @return array<string, mixed>|null
     */
    public function resolveSameValues(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        foreach ($this->fields ?? [] as $field) {
            if (isset($field['same_value'])) {
                [$first, $second] = array_map(fn (string $name): string => (string) ($payload[$name] ?? ''), $field['same_value']);
                $payload[$field['name']] = $first !== '' && $first === $second ? 'ya' : 'tidak';
            }
        }

        return $payload;
    }

    private function citizenByNik(mixed $nik): ?Citizen
    {
        if (! is_string($nik) || ! preg_match('/^\d{16}$/', $nik) || $this->villageId === null) {
            return null;
        }

        if (! array_key_exists($nik, $this->nikCitizens)) {
            $this->nikCitizens[$nik] = Citizen::query()
                ->where('village_id', $this->villageId)
                ->where('nik_hash', hash('sha256', $nik))
                ->where('is_active', true)
                ->with('family:id,no_kk')
                ->first();
        }

        return $this->nikCitizens[$nik];
    }

    public static function areaNumber(mixed $number): string
    {
        $number = trim((string) $number);

        return ctype_digit($number) ? str_pad($number, 3, '0', STR_PAD_LEFT) : $number;
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
                $rules = [...$rules, ...$this->repeaterRules($field, $payload[$field['name']] ?? null, $payload)];

                continue;
            }

            if (($field['type'] ?? 'text') === 'family_members') {
                $rules = [...$rules, ...$this->familyMemberRules($field)];

                continue;
            }

            // Disusun sistem saat pengajuan, bukan diisi pemohon.
            if (($field['type'] ?? 'text') === 'family_roster' || isset($field['same_value']) || isset($field['family_head_of'])) {
                $rules["payload.{$field['name']}"] = ['exclude'];

                continue;
            }

            if (($field['type'] ?? 'text') === 'family_member') {
                $members = $this->familyMembers()
                    ->when(isset($field['gender']), fn ($members) => $members->where('gender', $field['gender']))
                    ->when(isset($field['roles']), fn ($members) => $members->filter(
                        fn ($member): bool => in_array($member->family_role?->value, $field['roles'], true),
                    ))
                    ->when(isset($field['older_than']), fn ($members) => $this->olderThan($members, $field['older_than'], $payload))
                    ->when($field['not_self'] ?? false, fn ($members) => $members->where('id', '!==', $this->applicant?->id));
                $headOf = $field['required_when_head'] ?? null;

                if ($headOf !== null) {
                    // Calon kepala keluarga baru: yang tetap di KK, selain kepala keluarga sekarang.
                    $leaving = self::memberIdsOf($payload[$headOf] ?? null);
                    $members = $members->filter(fn ($member): bool => $member->family_role !== FamilyRole::KEPALA_KELUARGA
                        && ! in_array((string) $member->id, $leaving, true));

                    // Hanya berarti bila kepala keluarga ikut keluar dan masih ada anggota yang tinggal.
                    if (! $this->isFamilyHead($payload[$headOf] ?? null) || $members->isEmpty()) {
                        $rules["payload.{$field['name']}"] = ['exclude'];

                        continue;
                    }
                }

                $required = ($field['required'] ?? false) || $headOf !== null;
                $rules["payload.{$field['name']}"] = [
                    $required ? 'required' : 'nullable',
                    'string',
                    Rule::in($members->pluck('id')->map(fn ($id): string => (string) $id)->all()),
                    ...(isset($field['different']) ? ["different:payload.{$field['different']}"] : []),
                ];

                continue;
            }

            if (($field['type'] ?? 'text') === 'village_area') {
                $rules["payload.{$field['name']}"] = [
                    ($field['required'] ?? false) ? 'required' : 'nullable',
                    'integer',
                    $this->villageRtRule(),
                ];

                continue;
            }

            // Nama dari data penduduk bila NIK-nya terdaftar.
            $fromNik = $field['from_nik'] ?? null;
            $known = $fromNik !== null && $this->citizenByNik($payload[$fromNik] ?? null) !== null;

            $rules["payload.{$field['name']}"] = [
                ($field['required'] ?? false) && ! $known ? 'required' : 'nullable',
                ...self::typeRules($field),
                ...(isset($field['witness']) ? [$this->witnessRule($field, $payload)] : []),
                ...(isset($field['date_order']) ? [$this->dateOrderRule($field, $payload)] : []),
                ...(($field['village_citizen'] ?? false) ? [$this->villageCitizenRule()] : []),
                ...(($field['village_family'] ?? false) ? [$this->villageFamilyRule()] : []),
                ...(isset($field['role_of']) ? [$this->roleGenderRule($field['role_of'], $payload)] : []),
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
                $this->occupationRule(),
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
            // Jam 24 jam dari input waktu, mis. 08:30.
            'time' => ['date_format:H:i'],
            'number' => ['numeric'],
            'nik' => ['digits:16'],
            'select' => ['string', Rule::in(array_column($field['options'] ?? [], 'value'))],
            default => ['string', 'max:255'],
        };
    }

    /**
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $payload  jawaban form lengkap (mis. untuk one_head)
     * @return array<string, array<int, mixed>>
     */
    private function repeaterRules(array $field, mixed $rows, array $payload = []): array
    {
        $name = $field['name'];
        $required = (bool) ($field['required'] ?? false);
        $min = (int) ($field['min'] ?? ($required ? 1 : 0));
        $max = (int) ($field['max'] ?? self::REPEATER_MAX_ROWS);
        $allowed = [
            ...array_column($field['fields'] ?? [], 'name'),
            ...array_map(
                fn (array $subField): string => "{$subField['name']}_lainnya",
                array_filter($field['fields'] ?? [], fn (array $subField): bool => ($subField['type'] ?? 'text') === 'occupation'),
            ),
        ];
        $memberIds = $this->familyMembers()->pluck('id')->map(fn ($id): string => (string) $id)->all();

        $memberColumns = array_column(array_filter($field['fields'] ?? [], fn (array $subField): bool => ($subField['type'] ?? 'text') === 'family_member'), 'name');
        $rules = [
            "payload.{$name}" => [
                $min > 0 ? 'required' : 'nullable',
                'array',
                ...($min > 0 ? ["min:{$min}"] : []),
                "max:{$max}",
                // Satu anggota KK hanya satu baris.
                function (string $attribute, mixed $value, \Closure $fail) use ($memberColumns): void {
                    foreach ($memberColumns as $column) {
                        $ids = array_filter(array_column(array_filter((array) $value, 'is_array'), $column));

                        if (count($ids) !== count(array_unique($ids))) {
                            $fail('Anggota keluarga yang sama dipilih lebih dari sekali.');
                        }
                    }
                },
                ...(isset($field['one_head']) ? [$this->oneHeadRule($field['one_head'], $payload)] : []),
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
                $key = "payload.{$name}.{$index}.{$subField['name']}";
                $type = $subField['type'] ?? 'text';

                if (! in_array($subField['name'], $visible, true)) {
                    $rules[$key] = ['exclude'];
                    $rules["{$key}_lainnya"] = ['exclude'];

                    continue;
                }

                $presence = ($subField['required'] ?? false) ? 'required' : 'nullable';
                $rules[$key] = match ($type) {
                    'family_member' => [$presence, 'string', Rule::in($memberIds)],
                    'occupation' => [$presence, 'string', $this->occupationRule()],
                    default => [$presence, ...self::typeRules($subField)],
                };

                if (isset($subField['role_of'])) {
                    $rules[$key][] = $this->roleGenderRule($subField['role_of'], $row);
                }

                if ($type === 'occupation') {
                    $rules["{$key}_lainnya"] = ["required_if:{$key},".self::OTHER_OCCUPATION, 'nullable', 'string', 'max:100'];
                }
            }
        }

        return $rules;
    }

    /**
     * Nilai isian pekerjaan: id katalog aktif desa ini, atau "Lainnya".
     */
    private function occupationRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
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
        };
    }

    /**
     * Kunci baris yang disimpan: sub-isian yang tampil, ditambah teks
     * "Lainnya" untuk sub-isian pekerjaan.
     *
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $row
     * @return array<int, string>
     */
    private static function keptRowKeys(array $field, array $row): array
    {
        $visible = self::visibleRowFieldNames($field, $row);
        $keys = $visible;

        foreach ($field['fields'] ?? [] as $subField) {
            if (($subField['type'] ?? 'text') === 'occupation' && in_array($subField['name'], $visible, true)) {
                $keys[] = "{$subField['name']}_lainnya";
            }
        }

        return $keys;
    }

    /**
     * Baris repeater disimpan siap cetak:
     *  - sub-isian pekerjaan: nama pekerjaan (katalog, atau teks "Lainnya"
     *    yang dirapikan) dan `<sub>_id` (id katalog; null bila "Lainnya");
     *  - sub-isian family_member: id warga tetap disimpan, ditambah kolom
     *    turunan `<sub>_nama`, `<sub>_nik`, `<sub>_shdk`, dan keadaan
     *    pendidikan/pekerjaan/agama/status kawin saat pengajuan.
     *
     * @param  array<string, mixed>|null  $payload  payload yang sudah tervalidasi
     * @return array<string, mixed>|null
     */
    public function resolveRows(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        $catalog = null;
        $members = null;

        foreach ($this->fieldsOfType('repeater') as $field) {
            if (! is_array($payload[$field['name']] ?? null)) {
                continue;
            }

            foreach ($payload[$field['name']] as $index => $row) {
                foreach ($field['fields'] ?? [] as $subField) {
                    $name = $subField['name'];
                    $value = $row[$name] ?? null;

                    if (($subField['type'] ?? 'text') === 'occupation') {
                        $other = $row["{$name}_lainnya"] ?? null;
                        unset($row["{$name}_lainnya"]);

                        if ($value !== null && $value !== '') {
                            $catalog ??= Occupation::query()
                                ->where('village_id', $this->villageId)
                                ->where('is_active', true)
                                ->pluck('name', 'id')
                                ->all();
                            $isOther = (string) $value === self::OTHER_OCCUPATION;
                            $row["{$name}_id"] = $isOther ? null : (int) $value;
                            $row[$name] = $isOther
                                ? OccupationName::normalize((string) $other, array_values($catalog))
                                : $catalog[(int) $value];
                        }
                    }

                    if (($subField['type'] ?? 'text') === 'family_member' && $value !== null && $value !== '') {
                        $members ??= $this->familyMembers()->loadMissing(self::MEMBER_RELATIONS)->keyBy('id');
                        $values = self::memberValues($members[$value]);

                        foreach (self::ROW_MEMBER_KEYS as $key) {
                            $row["{$name}_{$key}"] = $values[$key];
                        }
                    }
                }

                $payload[$field['name']][$index] = $row;
            }
        }

        return $payload;
    }

    /**
     * Anggota yang minimal `years` tahun lebih tua dari acuan di isian
     * `field`: anggota KK (family_member) atau tanggal (mis. lahir bayi).
     * Tanpa acuan, atau anggota tanpa tanggal lahir, tidak disaring.
     *
     * @param  Collection<int, Citizen>  $members
     * @param  array{field: string, years: int}  $rule
     * @param  array<string, mixed>  $payload
     * @return Collection<int, Citizen>
     */
    private function olderThan(Collection $members, array $rule, array $payload): Collection
    {
        $value = $payload[$rule['field']] ?? null;
        $reference = is_string($value) && $value !== ''
            ? ($this->familyMembers()->firstWhere('id', $value)?->date_of_birth ?? rescue(fn () => Carbon::parse($value), null, false))
            : null;

        if ($reference === null) {
            return $members;
        }

        $latest = Carbon::parse($reference)->subYears((int) $rule['years']);

        return $members->filter(fn ($member): bool => $member->date_of_birth === null || $member->date_of_birth->lte($latest));
    }

    /**
     * Id anggota terpilih: satu id (family_member), daftar id
     * (family_members), atau kolom family_member tiap baris repeater.
     *
     * @return array<int, string>
     */
    public static function memberIdsOf(mixed $value): array
    {
        $ids = [];

        foreach ((array) $value as $item) {
            $id = is_array($item) ? collect($item)->first(fn (mixed $cell, string $key): bool => $key === 'anggota') : $item;

            if (is_scalar($id) && $id !== '') {
                $ids[] = (string) $id;
            }
        }

        return $ids;
    }

    /**
     * Apakah anggota terpilih (satu id, atau daftar id isian family_members)
     * termasuk kepala keluarga.
     */
    /**
     * Jawaban isian `from_applicant` diganti nilai dari data pemohon, sebelum
     * divalidasi (agar syarat tampil isian lain mengikutinya).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function withApplicantValues(array $payload): array
    {
        foreach ($this->fields ?? [] as $field) {
            // Isian ber-`default` yang tidak dijawab memakai nilai bawaannya.
            if (isset($field['default']) && ($payload[$field['name']] ?? '') === '') {
                $payload[$field['name']] = $field['default'];
            }

            $source = $field['from_applicant'] ?? null;
            $raw = $source !== null ? $this->applicant?->getAttribute($source['column']) : null;
            $raw = $raw instanceof \BackedEnum ? $raw->value : $raw;
            $value = is_scalar($raw) ? ($source['map'][(string) $raw] ?? null) : null;

            if ($value !== null) {
                $payload[$field['name']] = $value;
            }
        }

        return $payload;
    }

    /**
     * Tepat satu kepala keluarga di baris repeater (`column`) ditambah isian
     * `with` (mis. SHDK pasangan), untuk KK baru.
     *
     * @param  array{column: string, with?: string}  $rule
     * @param  array<string, mixed>  $payload
     */
    private function oneHeadRule(array $rule, array $payload): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($rule, $payload): void {
            $roles = array_column(array_filter((array) $value, 'is_array'), $rule['column']);

            if (isset($rule['with'])) {
                $roles[] = $payload[$rule['with']] ?? null;
            }

            if (count(array_keys($roles, FamilyRole::KEPALA_KELUARGA->value, true)) !== 1) {
                $fail('Pilih tepat satu Kepala Keluarga untuk KK baru.');
            }
        };
    }

    /**
     * Suami laki-laki, Istri perempuan, menurut jenis kelamin orang di acuan
     * `role_of` (jawaban form, atau baris repeater).
     *
     * @param  array<string, mixed>  $answers
     */
    private function roleGenderRule(string $reference, array $answers): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($reference, $answers): void {
            $required = match ($value) {
                FamilyRole::SUAMI->value => 'L',
                FamilyRole::ISTRI->value => 'P',
                default => null,
            };
            $gender = $required === null ? null : $this->genderOf($reference, $answers);

            if ($gender !== null && $gender !== $required) {
                $fail($required === 'L' ? 'Suami harus laki-laki.' : 'Istri harus perempuan.');
            }
        };
    }

    /**
     * Jenis kelamin (L/P) orang di acuan `role_of`, atau null bila tidak diketahui.
     *
     * @param  array<string, mixed>  $answers
     */
    private function genderOf(string $reference, array $answers): ?string
    {
        if ($reference === 'family_head') {
            return $this->familyMembers()->firstWhere('family_role', FamilyRole::KEPALA_KELUARGA)?->gender;
        }

        $value = $answers[$reference] ?? null;

        if (in_array($value, ['L', 'P'], true)) {
            return $value;
        }

        return $this->familyMembers()->firstWhere('id', $value)?->gender
            ?? $this->citizenByNik($value)?->gender;
    }

    /**
     * NIK warga aktif desa ini yang bukan anggota KK pemohon.
     */
    private function villageCitizenRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $citizen = $this->citizenByNik($value);

            if ($citizen === null) {
                $fail('NIK ini tidak terdaftar sebagai warga desa.');
            } elseif ($this->familyMembers()->contains('id', $citizen->id)) {
                $fail('Warga ini sudah satu KK dengan Anda; pilih di daftar anggota keluarga.');
            }
        };
    }

    /**
     * No. KK lain (bukan KK pemohon) yang terdaftar di desa ini.
     */
    private function villageFamilyRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $family = $this->familyByNumber($value);

            if ($family === null) {
                $fail('No. KK ini tidak terdaftar di desa.');
            } elseif ($family->id === $this->applicant?->family_id) {
                $fail('No. KK ini adalah KK Anda sendiri.');
            }
        };
    }

    private function familyByNumber(mixed $number): ?Family
    {
        return is_string($number) && preg_match('/^\d{16}$/', $number) && $this->villageId !== null
            ? Family::query()->where('village_id', $this->villageId)->where('no_kk_hash', hash('sha256', $number))->first()
            : null;
    }

    /**
     * Isian NIK `family_head_of`: NIK kepala keluarga aktif KK tujuan.
     *
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>|null
     */
    public function resolveFamilyHeads(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        foreach ($this->fields ?? [] as $field) {
            $family = isset($field['family_head_of']) ? $this->familyByNumber($payload[$field['family_head_of']] ?? null) : null;
            $head = $family?->members()->where('family_role', FamilyRole::KEPALA_KELUARGA->value)->where('is_active', true)->first();

            if ($head !== null) {
                $payload[$field['name']] = $head->nik;
            }
        }

        return $payload;
    }

    /**
     * Urutan tanggal isian terhadap acuannya (`date_order`).
     *
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $payload
     */
    private function dateOrderRule(array $field, array $payload): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($field, $payload): void {
            $date = is_string($value) ? rescue(fn () => Carbon::parse($value)->startOfDay(), null, false) : null;

            if ($date === null) {
                return;
            }

            foreach ($field['date_order'] as $rule) {
                $after = isset($rule['after']);
                $reference = $this->referenceDate((string) ($rule['after'] ?? $rule['before']), $payload);

                if ($reference !== null && ($after ? $date->lt($reference) : $date->gt($reference))) {
                    $fail(($field['label'] ?? $field['name']).' tidak boleh '.($after ? 'sebelum ' : 'sesudah ').$rule['label'].'.');

                    return;
                }
            }
        };
    }

    /**
     * Tanggal acuan `date_order`: isian tanggal, atau `birth:<isian>`.
     *
     * @param  array<string, mixed>  $payload
     */
    private function referenceDate(string $reference, array $payload): ?Carbon
    {
        foreach (explode('|', $reference) as $source) {
            $birth = str_starts_with($source, 'birth:');
            $name = $birth ? substr($source, 6) : $source;
            $field = collect($this->fields ?? [])->firstWhere('name', $name);
            $value = $payload[$name] ?? null;

            $date = match (true) {
                // Isian NIK milik pemohon sendiri (self_when), mis. suami = pemohon.
                $birth && isset($field['self_when']) && FieldCondition::matches($field['self_when'], $payload) => $this->applicant?->date_of_birth,
                $birth && ($field['type'] ?? null) === 'family_member' => is_string($value) ? $this->familyMembers()->firstWhere('id', $value)?->date_of_birth : null,
                $birth && ($field['type'] ?? null) === 'nik' => $this->citizenByNik($value)?->date_of_birth,
                default => is_string($value) && $value !== '' ? rescue(fn () => Carbon::parse($value), null, false) : null,
            };

            if ($date !== null) {
                return Carbon::parse($date)->startOfDay();
            }
        }

        return null;
    }

    /**
     * Saksi harus orang lain: bukan pemohon, bukan saksi lainnya, dan bukan
     * pihak dalam surat (isian `not_same_as`).
     *
     * @param  array<string, mixed>  $field
     * @param  array<string, mixed>  $payload
     */
    private function witnessRule(array $field, array $payload): \Closure
    {
        $labels = array_column($this->fields ?? [], 'label', 'name');
        // "Saksi", atau pihak lain yang dimintai persetujuan (mis. Penerima Kuasa).
        $who = str_starts_with((string) $field['witness'], 'Saksi') ? 'Saksi' : (string) $field['witness'];

        return function (string $attribute, mixed $value, \Closure $fail) use ($field, $payload, $labels, $who): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            if ($this->applicant !== null && hash('sha256', $value) === $this->applicant->nik_hash) {
                $fail("{$who} tidak boleh pemohon sendiri.");

                return;
            }

            foreach ($field['not_same_as'] ?? [] as $other) {
                if (($payload[$other] ?? null) === $value) {
                    $fail("{$who} tidak boleh orang yang sama dengan ".($labels[$other] ?? $other).'.');

                    return;
                }
            }
        };
    }

    private function isFamilyHead(mixed $citizenIds): bool
    {
        $ids = self::memberIdsOf($citizenIds);

        return $ids !== [] && $this->familyMembers()->contains(
            fn ($member): bool => in_array((string) $member->id, $ids, true) && $member->family_role === FamilyRole::KEPALA_KELUARGA,
        );
    }

    /**
     * RT aktif milik desa jenis surat ini.
     */
    private function villageRtRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            $exists = Rt::query()
                ->whereKey((int) $value)
                ->where('village_id', $this->villageId)
                ->where('is_active', true)
                ->exists();

            if (! $exists) {
                $fail('Pilih dusun, RW, dan RT yang tersedia di desa ini.');
            }
        };
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
