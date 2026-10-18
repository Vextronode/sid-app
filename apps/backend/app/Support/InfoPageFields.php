<?php

namespace App\Support;

/**
 * Bagian khas desa pada halaman informasi publik, diisi Petugas Desa dari
 * menu Halaman Informasi. Teks bakunya ada di frontend
 * (features/info/infoPagesContent.js) dan merujuk field ini lewat kuncinya.
 *
 * Tipe: text, email, date (Y-m-d), list (daftar butir, bisa ditambah terus).
 */
class InfoPageFields
{
    public const TEXT_MAX = 300;

    public const LIST_MAX_ITEMS = 30;

    /**
     * @var array<string, array{title: string, fields: array<string, array{type: string, label: string, hint?: string}>}>
     */
    public const PAGES = [
        'ppid' => [
            'title' => 'PPID',
            'fields' => [
                'ppid_officer' => ['type' => 'text', 'label' => 'PPID Desa', 'hint' => 'Nama dan jabatan, mis. "Nama Lengkap, Sekretaris Desa"'],
                'ppid_supervisor' => ['type' => 'text', 'label' => 'Atasan PPID', 'hint' => 'Nama dan jabatan, mis. "Nama Lengkap, Kepala Desa"'],
                'decree_number' => ['type' => 'text', 'label' => 'Dasar penetapan', 'hint' => 'Nomor Keputusan Kepala Desa tentang PPID'],
                'periodic_info' => ['type' => 'list', 'label' => 'Informasi yang diumumkan secara berkala', 'hint' => 'Mis. profil desa, APBDes dan realisasinya, rencana kerja pemerintah desa, peraturan desa'],
                'immediate_info' => ['type' => 'list', 'label' => 'Informasi yang diumumkan serta-merta', 'hint' => 'Rincian informasi yang menyangkut keselamatan orang banyak, mis. peringatan banjir'],
                'available_info' => ['type' => 'list', 'label' => 'Informasi yang tersedia setiap saat'],
                'excluded_info' => ['type' => 'list', 'label' => 'Informasi yang dikecualikan', 'hint' => 'Sesuai penetapan desa'],
                'request_channel' => ['type' => 'text', 'label' => 'Saluran permohonan tertulis', 'hint' => 'Selain datang langsung, mis. email ppid@desa.id'],
                'copy_fee' => ['type' => 'text', 'label' => 'Biaya penggandaan atau pengiriman salinan', 'hint' => 'Mis. Rp500 per lembar fotokopi'],
                'ppid_email' => ['type' => 'email', 'label' => 'Email PPID'],
            ],
        ],
        'kebijakan-privasi' => [
            'title' => 'Kebijakan Privasi',
            'fields' => [
                'effective_date' => ['type' => 'date', 'label' => 'Tanggal berlaku'],
                'registration_data' => ['type' => 'list', 'label' => 'Data lain di formulir pendaftaran', 'hint' => 'Selain NIK, nama, nama pengguna, dan kata sandi; mis. nomor telepon atau email'],
                'server_manager' => ['type' => 'text', 'label' => 'Pengelola server', 'hint' => 'Pihak yang mengelola server tempat data disimpan'],
                'retention_period' => ['type' => 'text', 'label' => 'Jangka waktu penyimpanan data permohonan', 'hint' => 'Mis. 5 tahun'],
                'contact_email' => ['type' => 'email', 'label' => 'Email pengelola data', 'hint' => 'Kosongkan untuk memakai email kantor desa'],
            ],
        ],
        'aksesibilitas' => [
            'title' => 'Aksesibilitas',
            'fields' => [
                'known_limitations' => ['type' => 'list', 'label' => 'Keterbatasan lain yang diketahui', 'hint' => 'Selain halaman yang belum diperiksa dan dokumen PDF'],
                'contact_email' => ['type' => 'email', 'label' => 'Email untuk laporan kendala', 'hint' => 'Kosongkan untuk memakai email kantor desa'],
                'response_time' => ['type' => 'text', 'label' => 'Jangka waktu tanggapan', 'hint' => 'Mis. 3 hari kerja'],
            ],
        ],
    ];

    public static function exists(string $page): bool
    {
        return isset(self::PAGES[$page]);
    }

    /**
     * @return array<string, array{type: string, label: string, hint?: string}>
     */
    public static function fields(string $page): array
    {
        return self::PAGES[$page]['fields'] ?? [];
    }

    /**
     * Isian lengkap halaman: setiap field ada; teks kosong jadi null, daftar
     * kosong jadi [] (butir kosong dibuang). Kunci yang tidak dikenal dibuang.
     *
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    public static function normalize(string $page, array $values): array
    {
        $normalized = [];

        foreach (self::fields($page) as $key => $field) {
            $value = $values[$key] ?? null;

            if ($field['type'] === 'list') {
                $normalized[$key] = array_values(array_filter(
                    array_map(fn ($item) => is_string($item) ? trim($item) : '', is_array($value) ? $value : []),
                    fn (string $item) => $item !== '',
                ));
            } else {
                $value = is_string($value) ? trim($value) : null;
                $normalized[$key] = $value === '' ? null : $value;
            }
        }

        return $normalized;
    }

    /**
     * @return array<string, mixed>
     */
    public static function rules(string $page): array
    {
        $rules = [];

        foreach (self::fields($page) as $key => $field) {
            $rules[$key] = match ($field['type']) {
                'list' => ['nullable', 'array', 'max:'.self::LIST_MAX_ITEMS],
                'email' => ['nullable', 'string', 'email', 'max:150'],
                'date' => ['nullable', 'date_format:Y-m-d'],
                default => ['nullable', 'string', 'max:'.self::TEXT_MAX],
            };

            if ($field['type'] === 'list') {
                $rules["{$key}.*"] = ['nullable', 'string', 'max:'.self::TEXT_MAX];
            }
        }

        return $rules;
    }
}
