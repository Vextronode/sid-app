<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AssignedRole;
use App\Enums\LetterTypeCategory;
use App\Models\ApprovalFlow;
use App\Models\LetterType;
use App\Models\Village;
use Database\Seeders\Concerns\DefinesLetterTypes;
use Illuminate\Database\Seeder;

/**
 * Sebelas jenis surat keterangan (A01-A11). Redaksi dan susunan tiap
 * template mengikuti template fisik kantor desa di
 * docs/template-surat-fisik/. Setiap jenis surat didefinisikan utuh di
 * satu tempat: isian form, template, kode klasifikasi nomor surat, dan
 * aksi data. Isian form hanya yang ada di template fisik (kecuali
 * foto usaha di A01). Nama isian = nama placeholder di template. Kop surat dan
 * wilayah administratif diambil dari profil desa, bukan ditulis tetap.
 * Semua surat bawaan ditangani Kaur TU & Umum (surat selesai dan Terapkan).
 */
class LetterTypeSeeder extends Seeder
{
    use DefinesLetterTypes;

    private const CLOSING = 'Demikian surat keterangan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.';

    // Urutan tanggal (`date_order`): anak tidak lahir sebelum pemohon.
    private const AFTER_APPLICANT_BORN = ['after' => 'birth:applicant', 'label' => 'tanggal lahir pemohon'];

    // Meninggal tidak sebelum lahir: dari data penduduk bila NIK terdaftar
    // (termasuk nonaktif), selain itu tanggal lahir yang diketik.
    private const AFTER_DECEASED_BORN = ['after' => 'birth:nik_almarhum|tanggal_lahir_almarhum', 'label' => 'tanggal lahir almarhum/almarhumah'];

    private const GENDER_OPTIONS = [
        ['value' => 'L', 'label' => 'Laki-laki'],
        ['value' => 'P', 'label' => 'Perempuan'],
    ];

    public function run(): void
    {
        foreach (Village::query()->get() as $village) {
            $flow = ApprovalFlow::query()
                ->where('village_id', $village->id)
                ->where('name', ApprovalFlowSeeder::DEFAULT_FLOW_NAME)
                ->firstOrFail();

            foreach ($this->letterTypes() as $type) {
                $sections = $type['sections'];
                $opening = $type['opening'] ?? null;
                unset($type['sections'], $type['opening']);

                LetterType::updateOrCreate(
                    ['village_id' => $village->id, 'code' => $type['code']],
                    array_merge([
                        'category' => LetterTypeCategory::Persuratan->value,
                        'requirement_info' => null,
                        'documents' => null,
                        'classification_code' => '470',
                        'produces_letter' => true,
                        'data_action' => 'none',
                        'data_fields' => null,
                        'data_subject_field' => null,
                    ], $type, [
                        'village_id' => $village->id,
                        'template' => $this->page($type['name'], $sections, $opening),
                        'assigned_role' => AssignedRole::KaurTuUmum->value,
                        'is_active' => true,
                        'flow_id' => $flow->id,
                    ])
                );
            }
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function letterTypes(): array
    {
        $applicant = $this->applicantBlock('Menerangkan dengan sebenarnya bahwa :');

        return [
            [
                'code' => 'A01',
                'name' => 'Surat Keterangan Usaha',
                'description' => 'Keterangan kepemilikan/menjalankan usaha di wilayah desa.',
                'requirement_info' => 'Foto usaha terkini.',
                'validity_days' => 365,
                'form_fields' => [
                    $this->text('jenis_usaha', 'Jenis Usaha', true, 'Masukkan jenis usaha'),
                    // Bukti usaha untuk pertimbangan RT dan Kepala Desa saat
                    // menyetujui; tidak dicetak di surat.
                    $this->image('foto_usaha', 'Foto Usaha Terkini'),
                ],
                'sections' => [
                    $applicant,
                    $this->paragraph('Orang tersebut diatas benar-benar warga kami dan perlu kami terangkan bahwa orang tersebut diatas benar-benar mempunyai kegiatan usaha &ldquo;{{ jenis_usaha }}&rdquo; di wilayah {{ village_region }}.'),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A02',
                'name' => 'Surat Keterangan Tidak Memiliki Rumah',
                'description' => 'Keterangan bahwa warga tidak memiliki rumah untuk keperluan bantuan atau administrasi.',
                'validity_days' => 90,
                'form_fields' => [],
                'sections' => [
                    $applicant,
                    $this->paragraph('Orang tersebut diatas benar-benar warga masyarakat Desa kami, dan menurut keterangan yang bersangkutan bahwa orang tersebut benar-benar <strong>tidak memiliki rumah</strong>.'),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A03',
                'name' => 'Surat Keterangan Penghasilan',
                'description' => 'Keterangan penghasilan untuk keperluan administrasi atau bantuan sosial.',
                'validity_days' => 90,
                'classification_code' => '510',
                'form_fields' => [
                    // Katalog pekerjaan desa (+ Lainnya, hanya dicetak); awalnya
                    // pekerjaan pemohon di data penduduk.
                    $this->prefilled($this->occupation('jenis_usaha', 'Bidang Usaha / Mata Pencaharian'), 'occupation_id'),
                    $this->rupiah('penghasilan_perbulan', 'Penghasilan per Bulan (Rp)', 'Contoh: 2500000'),
                ],
                'sections' => [
                    $applicant,
                    $this->paragraph('Orang tersebut di atas benar-benar warga masyarakat desa kami, yang mempunyai usaha dan mata pencaharian di bidang &ldquo;{{ jenis_usaha }}&rdquo; yang memiliki penghasilan Rp. {{ penghasilan_perbulan }},- ({{ penghasilan_perbulan_terbilang }} rupiah) setiap bulannya.'),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A04',
                'name' => 'Surat Keterangan Domisili',
                'description' => 'Keterangan domisili/tempat tinggal di wilayah desa.',
                'validity_days' => 90,
                'form_fields' => [
                    // Dusun -> RW -> RT dari data wilayah; awalnya RT pemohon.
                    $this->prefilled($this->area('alamat_domisili', 'Alamat Domisili Saat Ini'), 'rt_id'),
                ],
                'sections' => [
                    $applicant,
                    // Pendatang: "bukan warga masyarakat Desa kami, namun";
                    // warga desa: "benar-benar warga masyarakat Desa kami, dan".
                    $this->paragraph('Orang tersebut diatas {{ applicant_resident_phrase }} menurut keterangan RT/RW dan Kepala Dusun setempat yang bersangkutan saat ini tinggal dan berdomisili di alamat Dusun {{ alamat_domisili_dusun }} RT {{ alamat_domisili_rt }}/RW {{ alamat_domisili_rw }} {{ village_region }}.'),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A05',
                'name' => 'Surat Keterangan Tidak Mampu',
                'description' => 'Keterangan status ekonomi tidak mampu untuk keperluan bantuan sosial/pendidikan.',
                'validity_days' => 180,
                'form_fields' => [
                    // Anak warga desa diambil dari data penduduk lewat NIK; anak
                    // tidak lahir sebelum pemohon (orang tuanya).
                    ...$this->withField($this->lookupPersonFields('anak', 'Anak', nikRequired: true), 'tanggal_lahir_anak', [
                        'date_order' => [self::AFTER_APPLICANT_BORN],
                    ]),
                    // "untuk Melengkapi Persyaratan dan syarat ____" di template fisik.
                    $this->text('keperluan_persyaratan', 'Untuk Melengkapi Persyaratan', true, 'Contoh: pengajuan beasiswa'),
                ],
                'sections' => [
                    $applicant,
                    $this->personBlock('Selaku Orangtua dari :', 'anak'),
                    $this->paragraph('Orang tersebut benar-benar warga masyarakat Desa kami, yang Tinggal dan berdomisili di alamat tersebut diatas, menurut keterangan RT/ RW dan warga setempat bahwa orang tersebut benar-benar <strong>tidak mampu</strong>.'),
                    $this->paragraph('Demikian surat keterangan ini kami buat dengan sebenarnya untuk Melengkapi Persyaratan dan syarat {{ keperluan_persyaratan }}, Mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.'),
                ],
            ],
            [
                'code' => 'A06',
                'name' => 'Surat Keterangan Beda Nama',
                'description' => 'Keterangan perbedaan penulisan nama antar dokumen untuk orang yang sama.',
                'validity_days' => 90,
                'form_fields' => [
                    $this->textarea('nama_berbeda', 'Nama yang Berbeda', true, 'Tulis satu nama per baris, beserta dokumennya. Contoh: SITI AMINAH (KK an. Budi)'),
                    $this->text('sumber_dokumen', 'Dokumen yang Memuat Nama yang Benar', true, 'Contoh: Akta Kelahiran'),
                    $this->text('nomor_dokumen', 'Nomor Dokumen', true, 'Nomor dokumen tersebut'),
                    // Biasanya nama pemohon di data penduduk.
                    $this->prefilled($this->text('nama_benar', 'Nama yang Benar', true, 'Tuliskan nama yang benar'), 'name'),
                ],
                'sections' => [
                    $applicant,
                    $this->paragraph('Orang tersebut terdapat perbedaan nama dengan Kartu Keluarga di masing-masing Anak atas nama :', false),
                    '<div style="margin: 4px 0 12px 40px; line-height: 1.6;">{{ nama_berbeda }}</div>',
                    $this->paragraph('Sedangkan orangnya adalah orang yang sama dan nama yang benar adalah yang tercatat dalam {{ sumber_dokumen }} Nomor : {{ nomor_dokumen }} atas nama <strong>{{ nama_benar }}</strong>.', false),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A07',
                'name' => 'Surat Keterangan Penguburan',
                'description' => 'Keterangan kematian dan penguburan untuk keperluan administrasi keluarga.',
                'validity_days' => 90,
                'form_fields' => [
                    // Identitas di surat ini milik almarhum, bukan pemohon.
                    ...$this->deceasedFields('Almarhum/Almarhumah'),
                    $this->pastDate('tanggal_meninggal', 'Tanggal Meninggal', order: [self::AFTER_DECEASED_BORN]),
                    $this->text('tempat_meninggal', 'Tempat Meninggal', true, 'Tuliskan tempat meninggal'),
                    $this->text('sebab', 'Sebab Meninggal', false, 'Contoh: sakit / kecelakaan'),
                    $this->pastDate('tanggal_pemakaman', 'Tanggal Pemakaman', order: [['after' => 'tanggal_meninggal', 'label' => 'tanggal meninggal']]),
                    $this->text('tempat_pemakaman', 'Tempat Pemakaman', true, 'Tuliskan tempat pemakaman'),
                ],
                // Setelah final approve, Kasi/Kaur menonaktifkan data warga
                // almarhum. Warganya dicari lewat NIK almarhum di form;
                // bila kosong atau keliru, Kasi/Kaur mengisinya saat Terapkan.
                'data_action' => 'update_citizen',
                'data_subject_field' => 'nik_almarhum',
                'data_fields' => [
                    [
                        'column' => 'is_active',
                        'label' => 'Status data warga',
                        'value' => false,
                        'value_label' => 'Dinonaktifkan (meninggal dunia)',
                    ],
                ],
                'sections' => [
                    $this->personBlock('Menerangkan dengan sebenarnya bahwa :', 'almarhum'),
                    $this->rowsBlock('Telah meninggal dunia pada :', [
                        'Hari' => '{{ tanggal_meninggal_hari }}',
                        'Tempat' => '{{ tempat_meninggal }}',
                        'Sebab' => '{{ sebab }}',
                    ]),
                    $this->rowsBlock('Jenazah Almarhum/almarhumah telah dimakamkan/dikuburkan pada :', [
                        'Hari' => '{{ tanggal_pemakaman_hari }}',
                        'Tempat Pemakaman' => '{{ tempat_pemakaman }}',
                    ]),
                    $this->paragraph('Demikian surat keterangan penguburan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.'),
                ],
            ],
            [
                'code' => 'A08',
                'name' => 'Surat Keterangan Kelahiran',
                'description' => 'Keterangan kelahiran untuk keperluan administrasi kartu keluarga atau akta kelahiran.',
                'validity_days' => 90,
                'form_fields' => [
                    // Pemohon adalah salah satu orang tua; datanya diambil
                    // dari akun. Pasangan warga desa diambil lewat NIK.
                    ...$this->withField(
                        $this->lookupPersonFields('pasangan', 'Pasangan (Suami/Istri)', nikRequired: true, nikRules: ['not_same_as' => ['nik_anak'], 'nik_gender' => 'opposite_applicant']),
                        'jenis_kelamin_pasangan',
                        ['opposite_applicant_gender' => true],
                    ),
                    // Anak yang baru lahir belum terdata sebagai warga desa dan
                    // tidak lahir sebelum kedua orang tuanya; alamatnya awalnya
                    // alamat pemohon.
                    ...$this->withField(
                        $this->withField(
                            $this->personFields('anak', 'Anak', nikRequired: false, nikRules: ['not_same_as' => ['nik_pasangan'], 'not_village_citizen' => true]),
                            'tanggal_lahir_anak',
                            ['date_order' => [
                                self::AFTER_APPLICANT_BORN,
                                // Pasangan warga desa: dari data penduduk; selain itu yang diketik.
                                ['after' => 'birth:nik_pasangan|tanggal_lahir_pasangan', 'label' => 'tanggal lahir pasangan'],
                            ]],
                        ),
                        'alamat_anak',
                        ['prefill_from_applicant' => 'address'],
                    ),
                ],
                // Setelah final approve, Kasi/Kaur menambahkan anak ke data
                // warga lewat Terapkan (NIK anak boleh dilengkapi saat itu).
                'data_action' => 'create_citizen',
                'data_fields' => [
                    ['column' => 'nik', 'label' => 'NIK Anak', 'source' => 'nik_anak'],
                    ['column' => 'name', 'label' => 'Nama Anak', 'source' => 'nama_anak'],
                    ['column' => 'place_of_birth', 'label' => 'Tempat Lahir', 'source' => 'tempat_lahir_anak'],
                    ['column' => 'date_of_birth', 'label' => 'Tanggal Lahir', 'source' => 'tanggal_lahir_anak'],
                    ['column' => 'gender', 'label' => 'Jenis Kelamin (L/P)', 'source' => 'jenis_kelamin_anak'],
                    ['column' => 'address', 'label' => 'Alamat', 'source' => 'alamat_anak'],
                ],
                'sections' => [
                    $applicant,
                    $this->personBlock(null, 'pasangan'),
                    $this->paragraph('Menurut data dan sepengetahuan kami bahwa orang tersebut warga Masyarakat Desa kami yang beralamat sesuai keterangan diatas, selanjutnya dengan ini menerangkan bahwa yang bersangkutan adalah pasangan suami istri yang memiliki anak {{ jenis_kelamin_anak }} dengan identitas sebagai berikut.'),
                    $this->personBlock(null, 'anak'),
                    $this->paragraph('Demikian surat keterangan ini kami buat dengan sebenarnya. Mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.'),
                ],
            ],
            [
                'code' => 'A09',
                'name' => 'Surat Keterangan Belum Menikah',
                'description' => 'Keterangan status belum menikah untuk keperluan administratif.',
                'validity_days' => 90,
                'form_fields' => [],
                'sections' => [
                    $applicant,
                    $this->paragraph('Orang tersebut diatas warga masyarakat Desa kami, namun menurut keterangan yang bersangkutan bahwa orang tersebut diatas benar-benar <strong>belum menikah</strong>.'),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A10',
                'name' => 'Surat Keterangan & Pertama Kali Memiliki Rumah',
                'description' => 'Keterangan baru pertama kali memiliki rumah, untuk persyaratan pengajuan KPR.',
                'validity_days' => 90,
                'form_fields' => [
                    $this->rupiah('penghasilan_perbulan', 'Rata-rata Penghasilan per Bulan (Rp)', 'Contoh: 4000000'),
                ],
                'sections' => [
                    $applicant,
                    $this->paragraph('Orang tersebut di atas benar-benar warga masyarakat desa kami, yang tinggal dan berdomisili di alamat tersebut di atas, menurut keterangan yang bersangkutan baru memiliki rumah pertama kali dan rata-rata penghasilan sebesar Rp. {{ penghasilan_perbulan }},-/ bulan ({{ penghasilan_perbulan_terbilang }} rupiah) selanjutnya surat keterangan ini dipergunakan untuk melengkapi persyaratan Pengajuan Perumahan Rakyat (KPR).'),
                    $this->paragraph(self::CLOSING),
                ],
            ],
            [
                'code' => 'A11',
                'name' => 'Surat Keterangan Ahli Waris',
                'description' => 'Keterangan bahwa pemohon adalah ahli waris dari warga yang telah meninggal dunia.',
                // Status ahli waris tidak kedaluwarsa.
                'validity_days' => null,
                'form_fields' => [
                    // Pemohon adalah ahli waris; datanya diambil dari akun.
                    ...$this->deceasedFields('Almarhum/Almarhumah'),
                    [...$this->occupation('pekerjaan_almarhum', 'Pekerjaan Almarhum/Almarhumah'), 'from_nik' => 'nik_almarhum', 'from_nik_value' => 'occupation'],
                    $this->pastDate('tanggal_meninggal', 'Tanggal Meninggal', order: [self::AFTER_DECEASED_BORN]),
                    $this->text('tempat_pemakaman', 'Nama TPU', true, 'Contoh: Cibenda'),
                ],
                // Template fisik tidak memakai blok Nama/Jabatan penanda tangan.
                'opening' => $this->paragraph('Yang bertanda tangan dibawah ini Kepala Desa {{ village_name_short }} Kecamatan {{ village_district }} Kabupaten {{ village_regency }} menerangkan dengan sebenarnya bahwa :'),
                'sections' => [
                    $this->heirBlock(
                        '{{ applicant_name }}',
                        '{{ applicant_gender }}',
                        '{{ applicant_nik }}',
                        '{{ applicant_birth_place_date }}',
                        '{{ applicant_occupation }}',
                        '{{ applicant_address }}',
                    ),
                    $this->paragraph('Berdasarkan keterangan yang bersangkutan dan tokoh masyarakat setempat adalah benar-benar Ahli Waris dari Almarhum/Almarhumah :'),
                    $this->heirBlock(
                        '{{ nama_almarhum }}',
                        '{{ jenis_kelamin_almarhum }}',
                        '{{ nik_almarhum }}',
                        '{{ tempat_lahir_almarhum }}, {{ tanggal_lahir_almarhum }}',
                        '{{ pekerjaan_almarhum }}',
                        '{{ alamat_almarhum }}',
                    ),
                    $this->paragraph('Yang telah meninggal dunia pada hari {{ tanggal_meninggal_hari }} dan dimakamkan di TPU {{ tempat_pemakaman }} dan ahli waris tersebut diatas bertanggung jawab apabila ada yang mengatas namakan Ahli Waris lain di kemudian hari.'),
                    $this->paragraph('Demikian Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.'),
                ],
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Isian form (helper umum di DefinesLetterTypes)
    // ------------------------------------------------------------------

    /**
     * Lima data identitas seseorang, sejajar dengan blok identitas di
     * template fisik: nama, tempat/tanggal lahir, NIK, jenis kelamin, alamat.
     *
     * @return array<int, array<string, mixed>>
     */
    private function personFields(string $suffix, string $who, bool $nikRequired, array $nikRules = []): array
    {
        return [
            $this->text("nama_{$suffix}", "Nama {$who}", true, 'Nama lengkap'),
            $this->text("tempat_lahir_{$suffix}", "Tempat Lahir {$who}", true, 'Kota/kabupaten'),
            $this->pastDate("tanggal_lahir_{$suffix}", "Tanggal Lahir {$who}"),
            // NIK warga desa harus sesuai jenis kelamin yang diisi, dan bukan NIK pemohon.
            [
                ...$this->field("nik_{$suffix}", "NIK {$who}", 'nik', $nikRequired, '16 digit NIK'),
                'nik_gender' => "jenis_kelamin_{$suffix}",
                'not_applicant' => true,
                ...$nikRules,
            ],
            $this->field("jenis_kelamin_{$suffix}", "Jenis Kelamin {$who}", 'select', true, null, ['options' => self::GENDER_OPTIONS]),
            $this->text("alamat_{$suffix}", "Alamat {$who}", true, 'Alamat lengkap'),
        ];
    }

    /**
     * Identitas seseorang lewat NIK: bila terdaftar di desa, nama, tempat &
     * tanggal lahir, jenis kelamin, dan alamat diambil dari data penduduk;
     * bila tidak, diketik.
     *
     * @return array<int, array<string, mixed>>
     */
    private function lookupPersonFields(string $suffix, string $who, bool $nikRequired, array $nikRules = []): array
    {
        $nik = "nik_{$suffix}";
        $fromNik = fn (array $field, string $value): array => [...$field, 'from_nik' => $nik, 'from_nik_value' => $value];

        return [
            [
                ...$this->field($nik, "NIK {$who}", 'nik', $nikRequired, '16 digit NIK'),
                'not_applicant' => true,
                'help' => "Bila terdaftar di desa ini, data {$this->lowerWho($who)} diambil dari data penduduk.",
                ...$nikRules,
            ],
            $fromNik($this->text("nama_{$suffix}", "Nama {$who}", true, 'Nama lengkap'), 'name'),
            $fromNik($this->text("tempat_lahir_{$suffix}", "Tempat Lahir {$who}", true, 'Kota/kabupaten'), 'place_of_birth'),
            $fromNik($this->pastDate("tanggal_lahir_{$suffix}", "Tanggal Lahir {$who}"), 'date_of_birth'),
            $fromNik($this->field("jenis_kelamin_{$suffix}", "Jenis Kelamin {$who}", 'select', true, null, ['options' => self::GENDER_OPTIONS]), 'gender'),
            $fromNik($this->text("alamat_{$suffix}", "Alamat {$who}", true, 'Alamat lengkap'), 'address'),
        ];
    }

    /**
     * Identitas almarhum/almarhumah lewat NIK, termasuk warga yang datanya
     * sudah dinonaktifkan; NIK boleh dikosongkan (data lalu diketik).
     *
     * @return array<int, array<string, mixed>>
     */
    private function deceasedFields(string $who): array
    {
        return $this->lookupPersonFields('almarhum', $who, nikRequired: false, nikRules: [
            'include_inactive' => true,
            'typed_when_empty' => true,
            'help' => 'Bila terdaftar di desa ini, data almarhum/almarhumah diambil dari data penduduk. Kosongkan bila tidak diketahui.',
        ]);
    }

    /**
     * Nominal rupiah: bilangan bulat lebih dari 0.
     *
     * @return array<string, mixed>
     */
    private function rupiah(string $name, string $label, string $placeholder): array
    {
        return [
            ...$this->number($name, $label, true, $placeholder),
            'integer' => true,
            'min_value' => 1,
            'help' => 'Tulis angka saja tanpa titik, mis. 2500000.',
        ];
    }

    /**
     * Tambahkan opsi ke satu isian di daftar isian.
     *
     * @param  array<int, array<string, mixed>>  $fields
     * @param  array<string, mixed>  $extra
     * @return array<int, array<string, mixed>>
     */
    private function withField(array $fields, string $name, array $extra): array
    {
        return array_map(fn (array $field): array => $field['name'] === $name ? [...$field, ...$extra] : $field, $fields);
    }

    /**
     * "Pasangan (Suami/Istri)" -> "pasangan" untuk kalimat keterangan.
     */
    private function lowerWho(string $who): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s*\(.*\)$/', '', $who)));
    }

    // ------------------------------------------------------------------
    // Template
    // ------------------------------------------------------------------

    /**
     * @param  array<int, string>  $sections
     * @param  string|null  $opening  pengganti blok penanda tangan bila
     *                                template fisik memakai satu paragraf pembuka
     */
    private function page(string $title, array $sections, ?string $opening = null): string
    {
        $kop = <<<'HTML'
        <div style="text-align: center; margin-bottom: 5px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 18%; text-align: center; vertical-align: middle;">
                        {{ logo_img }}
                    </td>
                    <td style="width: 64%; text-align: center; vertical-align: middle;">
                        <div style="font-size: 12pt; font-weight: bold;">PEMERINTAH KABUPATEN {{ village_regency_upper }}</div>
                        <div style="font-size: 12pt; font-weight: bold;">KECAMATAN {{ village_district_upper }}</div>
                        <div style="font-size: 14pt; font-weight: bold;">DESA {{ village_name_upper }}</div>
                        <div style="font-size: 9.5pt; margin-top: 2px;">{{ village_address }} Tlp. {{ village_phone }}</div>
                        <div style="font-size: 9.5pt; font-style: italic; color: #0000ff; text-decoration: underline;">email : {{ village_email }}</div>
                    </td>
                    <td style="width: 18%; text-align: right; vertical-align: bottom; font-size: 9.5pt;">
                        Kode Pos {{ village_postal_code }}
                    </td>
                </tr>
            </table>
            <div style="border-top: 3px solid #000; border-bottom: 1px solid #000; height: 2px; margin-top: 4px; margin-bottom: 15px;"></div>
        </div>
        HTML;

        $signer = $opening ?? $this->rowsBlock('Yang bertanda tangan dibawah ini :', [
            'Nama' => '{{ village_head_name }}',
            'Jabatan' => 'Kepala Desa {{ village_name_short }}',
        ]);

        $signature = <<<'HTML'
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p style="margin: 0;">{{ village_name_short }}, {{ issued_at }}</p>
                    <p style="margin: 2px 0 0 0;">Kepala Desa {{ village_name_short }}</p>
                    <div style="height: 64px; margin: 4px 0;">{{ signature_img }}</div>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">{{ village_head_name }}</p>
                </td>
            </tr>
        </table>
        HTML;

        $title = e(mb_strtoupper($title));
        $body = implode("\n", $sections);

        return <<<HTML
        <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
            {$kop}
            <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">{$title}</div>
                <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
            </div>
            {$signer}
            {$body}
            {$signature}
        </div>
        HTML;
    }

    /**
     * Blok identitas pemohon, diisi dari data akun.
     */
    private function applicantBlock(?string $intro): string
    {
        return $this->rowsBlock($intro, [
            'Nama' => '{{ applicant_name }}',
            'Tempat Tanggal Lahir' => '{{ applicant_birth_place_date }}',
            'NIK' => '{{ applicant_nik }}',
            'Jenis Kelamin' => '{{ applicant_gender }}',
            'Alamat' => '{{ applicant_address }}',
        ]);
    }

    /**
     * Blok identitas orang lain, diisi dari isian personFields().
     */
    private function personBlock(?string $intro, string $suffix): string
    {
        return $this->rowsBlock($intro, [
            'Nama' => "{{ nama_{$suffix} }}",
            'Tempat Tanggal Lahir' => "{{ tempat_lahir_{$suffix} }}, {{ tanggal_lahir_{$suffix} }}",
            'NIK' => "{{ nik_{$suffix} }}",
            'Jenis Kelamin' => "{{ jenis_kelamin_{$suffix} }}",
            'Alamat' => "{{ alamat_{$suffix} }}",
        ]);
    }

    /**
     * Blok identitas di template ahli waris: urutannya berbeda dari blok
     * identitas lain dan memuat pekerjaan.
     */
    private function heirBlock(string $name, string $gender, string $nik, string $birth, string $occupation, string $address): string
    {
        return $this->rowsBlock(null, [
            'Nama' => $name,
            'Jenis Kelamin' => $gender,
            'NIK' => $nik,
            'Tempat, tgl Lahir' => $birth,
            'Pekerjaan' => $occupation,
            'Alamat' => $address,
        ]);
    }
}
