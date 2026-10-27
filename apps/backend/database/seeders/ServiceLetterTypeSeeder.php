<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AssignedRole;
use App\Enums\FamilyRole;
use App\Enums\LetterDataAction;
use App\Enums\LetterTypeCategory;
use App\Models\ApprovalFlow;
use App\Models\LetterType;
use App\Models\Village;
use App\Support\CitizenLabels;
use Database\Seeders\Concerns\DefinesLetterTypes;
use Illuminate\Database\Seeder;

/**
 * Jenis surat Layanan Kependudukan (Fxx): formulir pelayanan kependudukan
 * (format Disdukcapil, docs/template-surat/pelayanan/) yang dibawa warga ke
 * instansi luar. Berbeda dari Persuratan Desa:
 *  - tanpa nomor surat desa dan tanpa TTD/stempel Kepala Desa (persetujuan
 *    RT dan Kepala Desa tetap tercatat di sistem);
 *  - setelah terbit, pemohon mengunggah hasil dari instansi pada surat yang
 *    sama untuk diverifikasi Kasi Pemerintahan, lalu data desa diperbarui.
 * Wilayah (desa, kecamatan, kabupaten, provinsi, kode pos) diambil dari
 * profil desa.
 */
class ServiceLetterTypeSeeder extends Seeder
{
    use DefinesLetterTypes;

    private const GENDER_OPTIONS = ['L' => 'Laki-laki', 'P' => 'Perempuan'];

    private const BLOOD_TYPE_OPTIONS = ['A' => 'A', 'B' => 'B', 'AB' => 'AB', 'O' => 'O', 'tidak_tahu' => 'Tidak Tahu'];

    // Sama dengan pilihan pendidikan terakhir di data warga.
    private const EDUCATION_OPTIONS = [
        'tidak_sekolah' => 'Tidak/Belum Sekolah',
        'sd' => 'SD/Sederajat',
        'smp' => 'SMP/Sederajat',
        'sma' => 'SMA/Sederajat',
        'diploma' => 'Diploma',
        's1' => 'S1',
        's2' => 'S2',
        's3' => 'S3',
    ];

    private const MOVE_REQUEST_OPTIONS = [
        'skp' => 'Surat Keterangan Pindah',
        'skpln' => 'Surat Keterangan Pindah Luar Negeri (SKPLN)',
    ];

    private const MOVE_CLASSIFICATION_OPTIONS = [
        'dalam_desa' => 'Dalam satu desa/kelurahan',
        'antar_desa' => 'Antar desa/kelurahan dalam satu kecamatan',
        'antar_kecamatan' => 'Antar kecamatan dalam satu kabupaten/kota',
        'antar_kabupaten' => 'Antar kabupaten/kota dalam satu provinsi',
        'antar_provinsi' => 'Antar provinsi',
    ];

    private const MOVE_REASON_OPTIONS = [
        'pekerjaan' => 'Pekerjaan',
        'pendidikan' => 'Pendidikan',
        'keamanan' => 'Keamanan',
        'kesehatan' => 'Kesehatan',
        'perumahan' => 'Perumahan',
        'keluarga' => 'Keluarga',
        'lainnya' => 'Lainnya',
    ];

    private const MOVE_TYPE_OPTIONS = [
        'kk' => 'Kepala Keluarga',
        'kk_seluruh' => 'Kepala Keluarga dan Seluruh Anggota Keluarga',
        'kk_sebagian' => 'Kepala Keluarga dan Sebagian Anggota Keluarga',
        'anggota' => 'Anggota Keluarga',
    ];

    private const MOVE_KK_STATUS_OPTIONS = [
        'numpang_kk' => 'Numpang KK',
        'kk_baru' => 'Membuat KK Baru',
    ];

    private const MOVE_CITIZENSHIP_OPTIONS = [
        'wni' => 'WNI (anggota KK saya)',
        'wna' => 'WNA (orang asing, saya sebagai perantara)',
    ];

    private const MOVE_CITIZEN = ['field' => 'kewarganegaraan', 'equals' => 'wni'];

    private const MOVE_FOREIGNER = ['field' => 'kewarganegaraan', 'equals' => 'wna'];

    private const ARRIVAL_RESIDENCE_OPTIONS = [
        'numpang_kk' => 'Numpang KK warga desa',
        'milik_sendiri' => 'Rumah milik sendiri/orang tua (membuat KK baru)',
        'orang_lain' => 'Rumah orang lain/kontrakan/kantor (membuat KK baru)',
    ];

    // Pendatang membuat KK baru (tidak numpang KK).
    private const ARRIVAL_NEW_FAMILY = ['field' => 'tempat_tinggal', 'in' => ['milik_sendiri', 'orang_lain']];

    private const ARRIVAL_PLACE_OPTIONS = [
        'rumah' => 'Rumah',
        'tempat_tinggal' => 'Tempat tinggal',
        'kontrakan' => 'Kontrakan',
        'kantor' => 'Kantor',
    ];

    private const BIRTH_PLACE_OPTIONS = [
        'rs' => 'RS/RB',
        'puskesmas' => 'Puskesmas',
        'polindes' => 'Polindes',
        'rumah' => 'Rumah',
        'lainnya' => 'Lainnya',
    ];

    private const BIRTH_TYPE_OPTIONS = [
        'tunggal' => 'Tunggal',
        'kembar2' => 'Kembar 2',
        'kembar3' => 'Kembar 3',
        'kembar4' => 'Kembar 4',
        'lainnya' => 'Lainnya',
    ];

    private const BIRTH_HELPER_OPTIONS = [
        'dokter' => 'Dokter',
        'bidan' => 'Bidan/Perawat',
        'dukun' => 'Dukun',
        'lainnya' => 'Lainnya',
    ];

    private const DEATH_CAUSE_OPTIONS = [
        'sakit' => 'Sakit biasa/tua',
        'wabah' => 'Wabah penyakit',
        'kecelakaan' => 'Kecelakaan',
        'kriminalitas' => 'Kriminalitas',
        'bunuh_diri' => 'Bunuh diri',
        'lainnya' => 'Lainnya',
    ];

    private const DEATH_WITNESS_OPTIONS = [
        'dokter' => 'Dokter',
        'nakes' => 'Tenaga Kesehatan',
        'polisi' => 'Kepolisian',
        'lainnya' => 'Lainnya',
    ];

    // Yang meninggal kepala keluarga (SHDK saat pengajuan).
    private const DECEASED_HEAD = ['field' => 'almarhum_shdk', 'equals' => 'Kepala Keluarga'];

    // Urutan tanggal (`date_order`): peristiwa tidak boleh sebelum suami/istri lahir.
    private const AFTER_SPOUSES_BORN = [
        ['after' => 'birth:nik_suami', 'label' => 'tanggal lahir suami'],
        ['after' => 'birth:nik_istri', 'label' => 'tanggal lahir istri'],
    ];

    private const FATHER_IS_APPLICANT = ['field' => 'pemohon_ayah', 'equals' => 'ya'];

    private const FATHER_IS_OTHER = ['field' => 'pemohon_ayah', 'equals' => 'tidak'];

    private const RESTRUCTURE_OPTIONS = [
        'kk_baru' => 'Membentuk KK baru (keluarga baru / pisah KK)',
        'ganti_kepala' => 'Ganti kepala keluarga',
        'numpang' => 'Masuk/numpang ke KK lain di desa',
    ];

    private const NEW_FAMILY_REASON_OPTIONS = [
        'keluarga_baru' => 'Membentuk keluarga baru (mis. setelah menikah)',
        'pisah' => 'Pisah KK',
    ];

    private const RESTRUCTURE_NEW = ['field' => 'jenis_perubahan', 'equals' => 'kk_baru'];

    private const RESTRUCTURE_HEAD = ['field' => 'jenis_perubahan', 'equals' => 'ganti_kepala'];

    private const RESTRUCTURE_JOIN = ['field' => 'jenis_perubahan', 'equals' => 'numpang'];

    // Selisih usia minimal ibu dengan anaknya (isian family_member `older_than`).
    private const MOTHER_MIN_AGE_GAP = 10;

    private const MARRIAGE_EVENT_OPTIONS = ['perkawinan' => 'Perkawinan', 'perceraian' => 'Perceraian'];

    private const SPOUSE_ROLE_OPTIONS = ['suami' => 'Suami', 'istri' => 'Istri'];

    private const YES_NO_OPTIONS = ['tidak' => 'Tidak', 'ya' => 'Ya'];

    // Pihak perkawinan/perceraian yang tidak boleh menjadi saksinya sendiri.
    private const SPOUSE_NIK_FIELDS = ['nik_suami', 'nik_istri'];

    private const MARRIAGE = ['field' => 'peristiwa', 'equals' => 'perkawinan'];

    private const DIVORCE = ['field' => 'peristiwa', 'equals' => 'perceraian'];

    private const UNRECORDED = ['field' => 'status_kawin_belum_tercatat', 'equals' => 'ya'];

    private const RECORDED = ['field' => 'status_kawin_belum_tercatat', 'equals' => 'tidak'];

    // F-2.10 pada F08: anak yang sudah lahir dan punya akta (isian family_member `anak`).
    private const ACKNOWLEDGED_CHILD = [
        'anak_nama' => '{{ anak_nama }}',
        'anak_nik' => '{{ anak_nik }}',
        'anak_jk' => '{{ anak_jenis_kelamin }}',
        'anak_ttl' => '{{ anak_tempat_lahir }}, {{ anak_tanggal_lahir }}',
        'anak_akta' => '{{ no_akta_lahir_anak }}',
        'anak_akta_tgl' => '{{#if tanggal_akta_lahir}}{{ tanggal_akta_lahir }}{{/if}}',
        'anak_akta_dinas' => '{{#if dinas_akta_lahir}}{{ dinas_akta_lahir }}{{/if}}',
        'anak_akta_alamat' => '{{#if alamat_dinas_akta}}{{ alamat_dinas_akta }}{{/if}}',
    ];

    private const SPONSOR_TYPE_OPTIONS = [
        'organisasi_internasional' => 'Organisasi Internasional',
        'pemerintah' => 'Pemerintah',
        'perusahaan' => 'Perusahaan',
        'perorangan' => 'Perorangan',
        'tanpa_sponsor' => 'Tanpa Sponsor',
    ];

    public function run(): void
    {
        foreach (Village::query()->get() as $village) {
            $flow = ApprovalFlow::query()
                ->where('village_id', $village->id)
                ->where('name', ApprovalFlowSeeder::DEFAULT_FLOW_NAME)
                ->firstOrFail();

            foreach ($this->letterTypes() as $type) {
                LetterType::updateOrCreate(
                    ['village_id' => $village->id, 'code' => $type['code']],
                    array_merge([
                        'requirement_info' => null,
                        'documents' => null,
                        'validity_days' => null,
                        'classification_code' => '470',
                        'produces_letter' => true,
                        'data_fields' => null,
                        'data_subject_field' => null,
                        'data_options' => null,
                        'data_instructions' => null,
                    ], $type, [
                        'village_id' => $village->id,
                        'category' => LetterTypeCategory::Pelayanan->value,
                        'assigned_role' => AssignedRole::KasiPemerintahan->value,
                        'issues_letter_number' => false,
                        'signed_by_village_head' => false,
                        'requires_result_upload' => true,
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
        return [
            [
                'code' => 'F01',
                'name' => 'Surat Pernyataan Tidak Memiliki Dokumen Kependudukan',
                'description' => 'Pernyataan bagi orang yang belum memiliki dokumen kependudukan (KK/KTP-el), sebagai syarat pendaftaran ke Disdukcapil.',
                'requirement_info' => 'Formulir dicetak lalu ditandatangani di atas materai oleh yang bersangkutan.',
                // Yang bersangkutan belum terdata, jadi identitasnya diisi di
                // form (pemohon biasanya anggota keluarga/penanggung jawabnya).
                'form_fields' => [
                    $this->text('nama_lengkap', 'Nama Lengkap (yang belum memiliki dokumen)', true, 'Nama lengkap sesuai keterangan'),
                    $this->text('tempat_lahir', 'Tempat Lahir', true, 'Kota/kabupaten'),
                    $this->date('tanggal_lahir', 'Tanggal Lahir'),
                    $this->select('jenis_kelamin', 'Jenis Kelamin', self::GENDER_OPTIONS),
                    $this->text('nama_ibu', 'Nama Ibu Kandung', true, 'Nama lengkap ibu'),
                    $this->select('golongan_darah', 'Golongan Darah', self::BLOOD_TYPE_OPTIONS, false),
                    $this->select('pendidikan_terakhir', 'Pendidikan Terakhir', self::EDUCATION_OPTIONS),
                    $this->area('alamat', 'Alamat di Desa Ini'),
                    // Didaftarkan ke KK pemohon setelah dokumennya terbit.
                    [...$this->select('shdk', 'Hubungan dengan Kepala Keluarga Anda', FamilyRole::memberOptions()), 'role_of' => 'jenis_kelamin'],
                ],
                'result_upload_hint' => 'Dokumen kependudukan yang terbit dari Disdukcapil (KK dan/atau KTP-el/KIA).',
                // Setelah dokumen terbit, orang ini ditambahkan ke KK pemohon;
                // NIK diisi Kasi dari dokumen terbitan Disdukcapil.
                'data_action' => LetterDataAction::CreateCitizen->value,
                'data_fields' => [
                    ['column' => 'nik', 'label' => 'NIK (dari dokumen terbitan Disdukcapil)', 'source' => null],
                    ['column' => 'name', 'label' => 'Nama Lengkap', 'source' => 'nama_lengkap'],
                    ['column' => 'gender', 'label' => 'Jenis Kelamin (L/P)', 'source' => 'jenis_kelamin'],
                    ['column' => 'place_of_birth', 'label' => 'Tempat Lahir', 'source' => 'tempat_lahir'],
                    ['column' => 'date_of_birth', 'label' => 'Tanggal Lahir', 'source' => 'tanggal_lahir'],
                    ['column' => 'mother_name_text', 'label' => 'Nama Ibu', 'source' => 'nama_ibu'],
                    ['column' => 'blood_type', 'label' => 'Golongan Darah', 'source' => 'golongan_darah'],
                    ['column' => 'last_education', 'label' => 'Pendidikan Terakhir', 'source' => 'pendidikan_terakhir'],
                    ['column' => 'family_role', 'label' => 'Hubungan dalam KK', 'source' => 'shdk'],
                    ['column' => 'rt_id', 'label' => 'Wilayah (RT)', 'source' => 'alamat'],
                ],
                'template' => $this->form('F-1.04', 'SURAT PERNYATAAN TIDAK MEMILIKI DOKUMEN KEPENDUDUKAN', [
                    $this->rowsBlock('Yang bertanda tangan di bawah ini :', [
                        'Nama Lengkap' => '{{ nama_lengkap }}',
                        'Tempat dan Tanggal Lahir' => '{{ tempat_lahir }}, {{ tanggal_lahir }}',
                        'Jenis Kelamin' => '{{ jenis_kelamin }}',
                        'Nama Ibu' => '{{ nama_ibu }}',
                        'Golongan Darah' => '{{ golongan_darah }}',
                        'Pendidikan Terakhir' => '{{ pendidikan_terakhir }}',
                        'Alamat' => 'Dusun {{ alamat_dusun }} RT {{ alamat_rt }} RW {{ alamat_rw }}',
                    ], 0),
                    $this->rowsBlock(null, [
                        'a. Desa/Kelurahan' => '{{ village_name_short }}',
                        'b. Kecamatan' => '{{ village_district }}',
                        'c. Kabupaten/Kota' => '{{ village_regency }}',
                        'd. Provinsi' => '{{ village_province }}',
                        'e. Kode Pos' => '{{ village_postal_code }}',
                    ], 185),
                    $this->paragraph('Dengan ini menyatakan bahwa saya tidak memiliki dokumen kependudukan dan apabila di kemudian hari ternyata pernyataan saya ini tidak benar, maka saya bersedia diproses secara hukum sesuai dengan peraturan perundang-undangan yang berlaku serta dokumen yang diterbitkan dari permohonan ini menjadi tidak sah.', false),
                    $this->stampedSignature('Yang menyatakan,', '{{ nama_lengkap }}'),
                ]),
            ],
            [
                'code' => 'F02',
                'name' => 'Perubahan Elemen Data Kependudukan',
                'description' => 'Perubahan pendidikan, pekerjaan, agama, atau status perkawinan anggota KK, untuk pembaruan KK di Disdukcapil.',
                'requirement_info' => 'Siapkan fotokopi KK lama dan bukti perubahan (ijazah, surat keterangan kerja, buku nikah/akta cerai, dsb.).',
                'form_fields' => [
                    // Satu baris per anggota KK yang datanya berubah; nilai
                    // "Semula" diambil dari data warga saat pengajuan.
                    $this->field('perubahan', 'Anggota yang Datanya Berubah', 'repeater', true, null, [
                        'max' => 10,
                        'item_label' => 'anggota',
                        'fields' => [
                            $this->field('anggota', 'Anggota Keluarga', 'family_member', true),
                            $this->select('pendidikan_menjadi', 'Pendidikan Terakhir Menjadi (kosongkan bila tetap)', CitizenLabels::LAST_EDUCATION, false),
                            $this->changeBasis('dasar_pendidikan', 'pendidikan_menjadi', 'Contoh: Ijazah SMA'),
                            $this->occupation('pekerjaan_menjadi', 'Pekerjaan Menjadi (kosongkan bila tetap)', false),
                            $this->changeBasis('dasar_pekerjaan', 'pekerjaan_menjadi', 'Contoh: Surat keterangan kerja'),
                            $this->select('agama_menjadi', 'Agama Menjadi (kosongkan bila tetap)', CitizenLabels::RELIGION, false),
                            $this->changeBasis('dasar_agama', 'agama_menjadi', 'Contoh: Surat keterangan pindah agama'),
                            $this->select('status_kawin_menjadi', 'Status Perkawinan Menjadi (kosongkan bila tetap)', CitizenLabels::MARITAL_STATUS, false),
                            $this->changeBasis('dasar_status_kawin', 'status_kawin_menjadi', 'Contoh: No. akta/buku nikah, atau SPTJM'),
                        ],
                    ]),
                    $this->select('status_kawin_belum_tercatat', 'Ada perkawinan/perceraian yang belum tercatat (belum punya buku nikah/akta cerai)?', ['tidak' => 'Tidak', 'ya' => 'Ya, belum tercatat']),
                    // SPTJM F-1.05, hanya bila perkawinan/perceraian belum tercatat.
                    ...$this->whenUnrecorded([
                        $this->select('sptjm_peristiwa', 'Peristiwa yang Belum Tercatat', ['perkawinan' => 'Perkawinan', 'perceraian' => 'Perceraian']),
                        [...$this->date('sptjm_tanggal', 'Tanggal Perkawinan/Perceraian'), 'date_order' => self::AFTER_SPOUSES_BORN],
                        $this->text('nama_suami', 'Nama Suami', true, 'Nama lengkap'),
                        $this->field('nik_suami', 'NIK Suami', 'nik', true, '16 digit NIK'),
                        $this->text('nama_istri', 'Nama Istri', true, 'Nama lengkap'),
                        $this->field('nik_istri', 'NIK Istri', 'nik', true, '16 digit NIK'),
                        ...$this->witness(1, 'I', parties: self::SPOUSE_NIK_FIELDS),
                        ...$this->witness(2, 'II', parties: self::SPOUSE_NIK_FIELDS),
                        $this->field('sptjm_anak', 'Anak dari Perkawinan Tersebut', 'repeater', false, null, [
                            'max' => 10,
                            'item_label' => 'anak',
                            'fields' => [
                                $this->text('nama', 'Nama Anak', true, 'Nama lengkap'),
                                $this->text('no_akta', 'No. Akta Kelahiran', false, 'Bila ada'),
                                $this->text('shdk', 'SHDK', true, 'Contoh: Anak'),
                            ],
                        ]),
                    ]),
                ],
                'documents' => [
                    ['key' => 'f1_02', 'title' => 'Formulir Pendaftaran Peristiwa Kependudukan (F-1.02)', 'template' => $this->registrationForm([
                        'kk.ubah.elemen' => true,
                        'ubah.kk' => true,
                        'lampiran.kk_lama' => true,
                        'lampiran.bukti' => true,
                        'lampiran.sptjm' => 'status_kawin_belum_tercatat=ya',
                    ])],
                    [
                        'key' => 'f1_05',
                        'title' => 'SPTJM Perkawinan/Perceraian Belum Tercatat (F-1.05)',
                        'when' => ['field' => 'status_kawin_belum_tercatat', 'equals' => 'ya'],
                        'template' => $this->unrecordedMarriageStatement(),
                    ],
                ],
                'result_upload_hint' => 'KK terbaru hasil perubahan data dari Disdukcapil.',
                // Terapkan mengubah kolom tiap anggota sesuai baris perubahan.
                'data_action' => LetterDataAction::UpdateMembers->value,
                'data_subject_field' => 'perubahan',
                'data_fields' => [
                    ['column' => 'last_education', 'label' => 'Pendidikan Terakhir', 'source' => 'pendidikan_menjadi'],
                    ['column' => 'occupation_id', 'label' => 'Pekerjaan', 'source' => 'pekerjaan_menjadi_id'],
                    ['column' => 'religion', 'label' => 'Agama', 'source' => 'agama_menjadi'],
                    ['column' => 'marital_status', 'label' => 'Status Perkawinan', 'source' => 'status_kawin_menjadi'],
                ],
                'template' => $this->elementChangeStatement(),
            ],
            [
                'code' => 'F03',
                'name' => 'Pindah Keluar',
                'description' => 'Pendaftaran perpindahan penduduk keluar desa (Surat Keterangan Pindah / SKPLN) untuk seluruh atau sebagian anggota KK, atau SKTT bagi orang asing yang diajukan lewat warga sebagai perantara.',
                'requirement_info' => 'Siapkan KK asli dan KTP-el anggota yang pindah (orang asing: paspor dan ITAS/ITAP). Formulir dibawa ke Disdukcapil untuk penerbitan surat keterangan pindah.',
                'form_fields' => [
                    $this->select('kewarganegaraan', 'Kewarganegaraan yang Pindah', self::MOVE_CITIZENSHIP_OPTIONS),
                    [
                        ...$this->select('jenis_permohonan', 'Jenis Permohonan', self::MOVE_REQUEST_OPTIONS),
                        'visible_when' => self::MOVE_CITIZEN,
                    ],
                    // Orang asing belum terdata: identitasnya diisi perantara.
                    ...$this->withCondition(self::MOVE_FOREIGNER, [
                        $this->text('nama_wna', 'Nama Lengkap Orang Asing', true, 'Sesuai paspor'),
                        $this->field('nik_wna', 'NIK Orang Asing', 'nik', false, 'Bila sudah punya (pemegang ITAP)'),
                        $this->text('no_kk_wna', 'No. KK Orang Asing', false, 'Bila sudah punya'),
                        $this->area('alamat_wna', 'Alamat di Desa Ini'),
                        $this->select('tipe_sponsor', 'Tipe Sponsor', self::SPONSOR_TYPE_OPTIONS),
                    ]),
                    ...$this->withCondition(['all' => [self::MOVE_FOREIGNER, ['field' => 'tipe_sponsor', 'not_in' => ['tanpa_sponsor']]]], [
                        $this->text('nama_sponsor', 'Nama Sponsor', true, 'Nama organisasi/instansi/perusahaan/perorangan'),
                        $this->textarea('alamat_sponsor', 'Alamat Sponsor', true, 'Alamat lengkap sponsor'),
                    ]),
                    ...$this->withCondition(self::MOVE_FOREIGNER, [
                        $this->text('nomor_itas', 'Nomor ITAS/ITAP', true, 'Nomor izin tinggal'),
                        $this->date('tanggal_itas', 'Tanggal Masa Berlaku ITAS/ITAP'),
                    ]),
                    // Alamat tujuan dalam negeri: Surat Keterangan Pindah dan SKTT.
                    ...$this->withCondition(['any' => [['field' => 'jenis_permohonan', 'equals' => 'skp'], self::MOVE_FOREIGNER]], [
                        $this->text('alamat_tujuan', 'Alamat Tujuan (Jalan/Dusun)', true, 'Contoh: Jl. H. Niming No. 5'),
                        $this->text('rt_tujuan', 'RT Tujuan', true, 'Contoh: 002'),
                        $this->text('rw_tujuan', 'RW Tujuan', true, 'Contoh: 003'),
                        $this->text('desa_tujuan', 'Desa/Kelurahan Tujuan', true, 'Contoh: Srengseng'),
                        $this->text('kecamatan_tujuan', 'Kecamatan Tujuan', true, 'Contoh: Kembangan'),
                        $this->text('kabupaten_tujuan', 'Kabupaten/Kota Tujuan', true, 'Contoh: Jakarta Barat'),
                        $this->text('provinsi_tujuan', 'Provinsi Tujuan', true, 'Contoh: DKI Jakarta'),
                        $this->text('kode_pos_tujuan', 'Kode Pos Tujuan', false, 'Bila diketahui'),
                        $this->select('klasifikasi_pindah', 'Klasifikasi Pindah', self::MOVE_CLASSIFICATION_OPTIONS),
                    ]),
                    // Tujuan luar negeri (SKPLN).
                    ...$this->withCondition(['field' => 'jenis_permohonan', 'equals' => 'skpln'], [
                        $this->text('negara_tujuan', 'Negara Tujuan', true, 'Contoh: Malaysia'),
                        $this->textarea('alamat_luar_negeri', 'Alamat Tujuan di Luar Negeri', true, 'Alamat lengkap di negara tujuan'),
                        $this->text('penanggung_jawab', 'Penanggung Jawab', true, 'Nama penanggung jawab di negara tujuan'),
                        $this->date('rencana_tanggal_pindah', 'Rencana Tanggal Pindah'),
                    ]),
                    $this->select('alasan_pindah', 'Alasan Pindah', self::MOVE_REASON_OPTIONS),
                    [
                        ...$this->text('alasan_lainnya', 'Alasan Lainnya', true, 'Sebutkan alasan pindah'),
                        'visible_when' => ['field' => 'alasan_pindah', 'equals' => 'lainnya'],
                    ],
                    $this->select('jenis_kepindahan', 'Jenis Kepindahan', self::MOVE_TYPE_OPTIONS),
                    // Hanya ditanyakan bila ada anggota yang tetap tinggal.
                    [
                        ...$this->select('status_tidak_pindah', 'Anggota Keluarga yang Tidak Pindah', self::MOVE_KK_STATUS_OPTIONS),
                        'visible_when' => ['field' => 'jenis_kepindahan', 'not_in' => ['kk_seluruh']],
                    ],
                    $this->select('status_pindah', 'Anggota Keluarga yang Pindah', self::MOVE_KK_STATUS_OPTIONS),
                    [
                        ...$this->field('anggota_pindah', 'Anggota Keluarga yang Pindah', 'family_members', true),
                        'visible_when' => self::MOVE_CITIZEN,
                    ],
                    // Wajib bila kepala keluarga ikut pindah dan ada anggota yang tetap tinggal (dicek server).
                    [
                        ...$this->field('kepala_baru', 'Kepala Keluarga Baru bagi Anggota yang Tetap Tinggal', 'family_member', false, null, [
                            'required_when_head' => 'anggota_pindah',
                        ]),
                        'visible_when' => self::MOVE_CITIZEN,
                    ],
                    [
                        ...$this->field('anggota_wna', 'Orang Asing yang Pindah', 'repeater', true, null, [
                            'max' => 10,
                            'item_label' => 'orang',
                            'fields' => [
                                $this->text('nama', 'Nama Lengkap', true, 'Sesuai paspor'),
                                $this->text('nik', 'NIK', false, 'Bila ada'),
                                $this->text('shdk', 'SHDK', true, 'Contoh: Kepala Keluarga'),
                            ],
                        ]),
                        'visible_when' => self::MOVE_FOREIGNER,
                    ],
                ],
                'documents' => [
                    // Sebagian anggota KK desa tetap tinggal: KK asal ikut berubah.
                    [
                        'key' => 'f1_02',
                        'title' => 'Formulir Pendaftaran Peristiwa Kependudukan (F-1.02)',
                        'when' => ['all' => [self::MOVE_CITIZEN, ['field' => 'jenis_kepindahan', 'not_in' => ['kk_seluruh']]]],
                        'template' => $this->registrationForm([
                            'kk.baru.ganti_kepala' => 'jenis_kepindahan=kk|kk_sebagian',
                            'ubah.kk' => true,
                            'lampiran.kk_lama' => true,
                        ]),
                    ],
                ],
                'result_upload_hint' => 'Surat Keterangan Pindah (SKPWNI), SKPLN, atau SKTT dari Disdukcapil, dan KK baru bagi anggota yang tetap tinggal (bila ada).',
                // Anggota KK yang pindah dinonaktifkan; orang asing tidak
                // terdata, jadi Terapkan hanya menandai selesai.
                'data_action' => LetterDataAction::DeactivateMembers->value,
                'data_subject_field' => 'anggota_pindah',
                // Kepala keluarga ikut pindah: anggota pilihan pemohon menjadi
                // kepala keluarga bagi yang tetap tinggal.
                'data_options' => ['new_head' => 'kepala_baru'],
                'data_instructions' => 'Anggota KK yang pindah dinonaktifkan beserta akunnya. Bila kepala keluarga ikut pindah, kepala keluarga baru pilihan pemohon ikut ditetapkan. Untuk orang asing (SKTT), tidak ada data warga yang diubah; cukup tandai selesai.',
                'template' => $this->moveOutForm(),
            ],
            [
                'code' => 'F04',
                'name' => 'Pindah Datang',
                'description' => 'Pendaftaran penduduk yang pindah datang ke desa, diajukan warga desa sebagai perantara (kepala keluarga yang ditumpangi, pemilik rumah, atau kerabat).',
                'requirement_info' => 'Siapkan Surat Keterangan Pindah (SKPWNI) dari daerah asal dan KTP-el/KK lama pendatang. Surat pernyataan ditandatangani di atas materai dan diketahui Ketua RT dan RW.',
                'form_fields' => [
                    $this->select('tempat_tinggal', 'Tempat Tinggal Pendatang di Desa', self::ARRIVAL_RESIDENCE_OPTIONS),
                    // Pendatang belum terdata: identitasnya diisi perantara.
                    $this->text('nama_pendatang', 'Nama Lengkap Pendatang', true, 'Sesuai KTP-el/KK lama'),
                    $this->field('nik_pendatang', 'NIK Pendatang', 'nik', true, '16 digit NIK'),
                    $this->text('tempat_lahir_pendatang', 'Tempat Lahir', true, 'Kota/kabupaten'),
                    $this->date('tanggal_lahir_pendatang', 'Tanggal Lahir'),
                    $this->select('jenis_kelamin_pendatang', 'Jenis Kelamin', self::GENDER_OPTIONS),
                    $this->select('agama_pendatang', 'Agama', CitizenLabels::RELIGION),
                    $this->occupation('pekerjaan_pendatang', 'Pekerjaan'),
                    $this->area('alamat_pendatang', 'Alamat Pendatang di Desa Ini'),
                    // Numpang KK: kepala keluarga yang KK-nya ditumpangi.
                    ...$this->withCondition(['field' => 'tempat_tinggal', 'equals' => 'numpang_kk'], [
                        $this->text('nama_kepala_keluarga', 'Nama Kepala Keluarga yang Ditumpangi', true, 'Nama lengkap'),
                        $this->field('nik_kepala_keluarga', 'NIK Kepala Keluarga', 'nik', true, '16 digit NIK'),
                        $this->field('no_kk_tujuan', 'No. KK yang Ditumpangi', 'nik', true, '16 digit No. KK'),
                        [...$this->select('shdk_pendatang', 'Hubungan Pendatang dengan Kepala Keluarga', FamilyRole::memberOptions()), 'role_of' => 'jenis_kelamin_pendatang'],
                        $this->occupation('pekerjaan_kepala_keluarga', 'Pekerjaan Kepala Keluarga'),
                        $this->area('alamat_kepala_keluarga', 'Alamat Kepala Keluarga'),
                    ]),
                    // Rumah orang lain/kontrakan/kantor: pemilik tempat tinggal.
                    ...$this->withCondition(['field' => 'tempat_tinggal', 'equals' => 'orang_lain'], [
                        $this->select('jenis_tempat', 'Jenis Tempat Tinggal', self::ARRIVAL_PLACE_OPTIONS),
                        $this->text('nama_pemilik', 'Nama Pemilik', true, 'Nama lengkap'),
                        $this->field('nik_pemilik', 'NIK Pemilik', 'nik', true, '16 digit NIK'),
                        $this->text('tempat_lahir_pemilik', 'Tempat Lahir Pemilik', true, 'Kota/kabupaten'),
                        $this->date('tanggal_lahir_pemilik', 'Tanggal Lahir Pemilik'),
                        $this->occupation('pekerjaan_pemilik', 'Pekerjaan Pemilik'),
                        $this->text('alamat_pemilik', 'Alamat Pemilik', true, 'Alamat lengkap pemilik'),
                    ]),
                    // Membuat KK baru: biodata untuk F-1.01.
                    ...$this->withCondition(self::ARRIVAL_NEW_FAMILY, [
                        $this->select('golongan_darah_pendatang', 'Golongan Darah', self::BLOOD_TYPE_OPTIONS, false),
                        $this->select('pendidikan_pendatang', 'Pendidikan Terakhir', CitizenLabels::LAST_EDUCATION),
                        $this->text('no_akta_lahir', 'No. Akta Kelahiran', false, 'Bila ada'),
                        $this->select('status_kawin_pendatang', 'Status Perkawinan', CitizenLabels::MARITAL_STATUS),
                    ]),
                    ...$this->withCondition(['all' => [self::ARRIVAL_NEW_FAMILY, ['field' => 'status_kawin_pendatang', 'equals' => 'kawin']]], [
                        $this->text('no_akta_kawin', 'No. Akta/Buku Nikah', false, 'Bila ada'),
                        [...$this->date('tanggal_kawin', 'Tanggal Perkawinan', false), 'date_order' => [['after' => 'tanggal_lahir_pendatang', 'label' => 'tanggal lahir pendatang']]],
                    ]),
                    ...$this->withCondition(['all' => [self::ARRIVAL_NEW_FAMILY, ['field' => 'status_kawin_pendatang', 'equals' => 'cerai_hidup']]], [
                        $this->text('no_akta_cerai', 'No. Akta Perceraian', false, 'Bila ada'),
                        [...$this->date('tanggal_cerai', 'Tanggal Perceraian', false), 'date_order' => [['after' => 'tanggal_lahir_pendatang', 'label' => 'tanggal lahir pendatang']]],
                    ]),
                    ...$this->withCondition(self::ARRIVAL_NEW_FAMILY, [
                        $this->text('nama_ibu_pendatang', 'Nama Ibu', true, 'Nama lengkap ibu'),
                        $this->field('nik_ibu_pendatang', 'NIK Ibu', 'nik', false, 'Bila diketahui'),
                        $this->text('nama_ayah_pendatang', 'Nama Ayah', true, 'Nama lengkap ayah'),
                        $this->field('nik_ayah_pendatang', 'NIK Ayah', 'nik', false, 'Bila diketahui'),
                        $this->text('telepon_pendatang', 'No. Telepon/HP', false, 'Contoh: 081234567890'),
                    ]),
                ],
                'documents' => [
                    [
                        'key' => 'pendatang_numpang_kk',
                        'title' => 'Surat Pernyataan Tidak Keberatan Numpang KK',
                        'when' => ['field' => 'tempat_tinggal', 'equals' => 'numpang_kk'],
                        'template' => $this->hostFamilyStatement(),
                    ],
                    [
                        'key' => 'pendatang_alamat_sendiri',
                        'title' => 'Surat Pernyataan Menggunakan Alamat Rumah Milik Sendiri',
                        'when' => ['field' => 'tempat_tinggal', 'equals' => 'milik_sendiri'],
                        'template' => $this->ownHomeStatement(),
                    ],
                    [
                        'key' => 'pendatang_alamat_orla',
                        'title' => 'Surat Pernyataan Alamat Digunakan dalam Administrasi Kependudukan',
                        'when' => ['field' => 'tempat_tinggal', 'equals' => 'orang_lain'],
                        'template' => $this->hostAddressStatement(),
                    ],
                    [
                        'key' => 'f1_01',
                        'title' => 'Formulir Biodata Keluarga (F-1.01)',
                        'orientation' => 'landscape',
                        'when' => self::ARRIVAL_NEW_FAMILY,
                        'template' => $this->arrivalBiodataForm(),
                    ],
                ],
                'result_upload_hint' => 'KK dan KTP-el pendatang yang terbit dari Disdukcapil (KK baru, atau KK yang ditumpangi bila numpang KK).',
                // Pendatang didaftarkan Kasi di Data Penduduk/KK sesuai KK
                // yang terbit, lalu ditandai selesai.
                'data_action' => LetterDataAction::CreateCitizen->value,
                // Numpang KK: masuk KK yang ditumpangi; rumah sendiri/orang
                // lain: KK baru (No. KK diisi Kasi) dengan pendatang sebagai
                // kepala keluarga.
                'data_options' => ['family' => [
                    'join' => ['when' => ['field' => 'tempat_tinggal', 'equals' => 'numpang_kk'], 'no_kk_field' => 'no_kk_tujuan'],
                    'create' => ['when' => self::ARRIVAL_NEW_FAMILY],
                ]],
                'data_fields' => [
                    ['column' => 'nik', 'label' => 'NIK', 'source' => 'nik_pendatang'],
                    ['column' => 'name', 'label' => 'Nama Lengkap', 'source' => 'nama_pendatang'],
                    ['column' => 'gender', 'label' => 'Jenis Kelamin (L/P)', 'source' => 'jenis_kelamin_pendatang'],
                    ['column' => 'place_of_birth', 'label' => 'Tempat Lahir', 'source' => 'tempat_lahir_pendatang'],
                    ['column' => 'date_of_birth', 'label' => 'Tanggal Lahir', 'source' => 'tanggal_lahir_pendatang'],
                    ['column' => 'religion', 'label' => 'Agama', 'source' => 'agama_pendatang'],
                    ['column' => 'occupation_id', 'label' => 'Pekerjaan', 'source' => 'pekerjaan_pendatang_id'],
                    ['column' => 'blood_type', 'label' => 'Golongan Darah', 'source' => 'golongan_darah_pendatang'],
                    ['column' => 'last_education', 'label' => 'Pendidikan Terakhir', 'source' => 'pendidikan_pendatang'],
                    ['column' => 'marital_status', 'label' => 'Status Perkawinan', 'source' => 'status_kawin_pendatang'],
                    ['column' => 'mother_name_text', 'label' => 'Nama Ibu', 'source' => 'nama_ibu_pendatang'],
                    ['column' => 'father_name_text', 'label' => 'Nama Ayah', 'source' => 'nama_ayah_pendatang'],
                    ['column' => 'family_role', 'label' => 'Hubungan dalam KK', 'source' => 'shdk_pendatang'],
                    ['column' => 'rt_id', 'label' => 'Wilayah (RT)', 'source' => 'alamat_pendatang'],
                    ['column' => 'residency_type', 'label' => 'Status Kependudukan', 'value' => 'pendatang', 'value_label' => 'Pendatang'],
                ],
                // F-1.02 atas nama pendatang (bukan perantara).
                'template' => $this->registrationForm([
                    'kk.ubah.menumpang' => 'tempat_tinggal=numpang_kk',
                    'kk.baru.pindah_datang' => 'tempat_tinggal=milik_sendiri|orang_lain',
                    'ktp.pindah_datang' => true,
                    'lampiran.skp' => true,
                    'lampiran.bersedia_menerima' => 'tempat_tinggal=numpang_kk',
                ], [
                    'name' => '{{ nama_pendatang }}',
                    'nik' => '{{ nik_pendatang }}',
                    'family_number' => $this->blank('no_kk_tujuan'),
                ]),
            ],
            [
                'code' => 'F05',
                'name' => 'Pelaporan Kelahiran',
                'description' => 'Pelaporan kelahiran anak untuk penerbitan akta kelahiran dan KK baru di Disdukcapil.',
                'requirement_info' => 'Siapkan surat keterangan lahir dari RS/puskesmas/bidan (bila ada), KK dan KTP-el orang tua, serta KTP-el dua orang saksi.',
                'form_fields' => [
                    // Data anak.
                    $this->text('nama_anak', 'Nama Anak', true, 'Nama lengkap anak'),
                    $this->select('jenis_kelamin_anak', 'Jenis Kelamin Anak', self::GENDER_OPTIONS),
                    $this->select('tempat_dilahirkan', 'Tempat Dilahirkan', self::BIRTH_PLACE_OPTIONS),
                    $this->text('tempat_kelahiran', 'Tempat Kelahiran (Kota/Kabupaten)', true, 'Contoh: Pangandaran'),
                    [
                        ...$this->date('tanggal_lahir_anak', 'Tanggal Lahir Anak'),
                        'date_order' => [
                            ['after' => 'birth:ibu', 'label' => 'tanggal lahir ibu'],
                            ['after' => 'birth:ayah|tanggal_lahir_ayah', 'label' => 'tanggal lahir ayah'],
                        ],
                    ],
                    $this->time('pukul_lahir', 'Pukul Lahir'),
                    $this->select('jenis_kelahiran', 'Jenis Kelahiran', self::BIRTH_TYPE_OPTIONS),
                    $this->number('kelahiran_ke', 'Kelahiran ke-', true, 'Contoh: 2'),
                    $this->select('penolong_kelahiran', 'Penolong Kelahiran', self::BIRTH_HELPER_OPTIONS),
                    $this->text('berat_bayi', 'Berat Bayi (kg)', true, 'Contoh: 3,2'),
                    $this->number('panjang_bayi', 'Panjang Bayi (cm)', true, 'Contoh: 49'),
                    // Orang tua: dipilih dari KK pemohon; ayah boleh di luar KK.
                    // Ibu = anggota perempuan apa pun SHDK-nya (mis. anak yang
                    // melahirkan, ibu tunggal kepala keluarga); ayah laki-laki.
                    $this->field('ibu', 'Ibu (anggota KK)', 'family_member', true, null, [
                        'gender' => 'P',
                        'older_than' => ['field' => 'tanggal_lahir_anak', 'years' => self::MOTHER_MIN_AGE_GAP],
                    ]),
                    $this->field('ayah', 'Ayah (anggota KK; kosongkan bila tidak ada di KK)', 'family_member', false, null, ['gender' => 'L']),
                    ...$this->withCondition(['field' => 'ayah', 'filled' => false], [
                        $this->text('nama_ayah', 'Nama Ayah', true, 'Nama lengkap ayah'),
                        $this->field('nik_ayah', 'NIK Ayah', 'nik', false, 'Bila diketahui'),
                        $this->text('tempat_lahir_ayah', 'Tempat Lahir Ayah', true, 'Kota/kabupaten'),
                        $this->date('tanggal_lahir_ayah', 'Tanggal Lahir Ayah'),
                    ]),
                    // Dua saksi kelahiran.
                    ...$this->witness(1, 'I', withFamilyNumber: true),
                    ...$this->witness(2, 'II', withFamilyNumber: true),
                    // SPTJM F-2.03 bila tidak ada surat keterangan lahir.
                    $this->select('surat_lahir', 'Ada surat keterangan lahir dari RS/puskesmas/bidan?', ['ada' => 'Ada', 'tidak' => 'Tidak ada']),
                    ...$this->withCondition(['field' => 'surat_lahir', 'equals' => 'tidak'], [
                        $this->text('nama_penolong', 'Nama Penolong Kelahiran', true, 'Nama lengkap'),
                        $this->field('nik_penolong', 'NIK Penolong Kelahiran', 'nik', false, 'Bila diketahui'),
                        $this->text('pekerjaan_penolong', 'Pekerjaan Penolong Kelahiran', true, 'Contoh: Bidan'),
                        $this->text('alamat_penolong', 'Alamat Penolong Kelahiran', true, 'Alamat lengkap'),
                    ]),
                    // Pengakuan anak F-2.10 bila perkawinan orang tua belum tercatat.
                    $this->select('pengakuan_ayah', 'Ayah mengakui anak (perkawinan orang tua belum tercatat)?', ['tidak' => 'Tidak', 'ya' => 'Ya']),
                    ...$this->withCondition(['all' => [['field' => 'pengakuan_ayah', 'equals' => 'ya'], ['field' => 'ayah', 'filled' => false]]], [
                        $this->occupation('pekerjaan_ayah', 'Pekerjaan Ayah'),
                        $this->textarea('alamat_ayah', 'Alamat Ayah', true, 'Alamat lengkap ayah'),
                    ]),
                ],
                'documents' => [
                    [
                        'key' => 'f2_03',
                        'title' => 'SPTJM Kebenaran Data Kelahiran (F-2.03)',
                        'when' => ['field' => 'surat_lahir', 'equals' => 'tidak'],
                        'template' => $this->birthStatementForm(),
                    ],
                    [
                        'key' => 'f2_10',
                        'title' => 'Surat Pernyataan Pengakuan Anak (F-2.10)',
                        'when' => ['field' => 'pengakuan_ayah', 'equals' => 'ya'],
                        'template' => $this->acknowledgementForm(),
                    ],
                ],
                'result_upload_hint' => 'Kutipan akta kelahiran dan KK baru yang memuat anak, dari Disdukcapil.',
                // Anak ditambahkan ke KK pemohon; NIK diisi Kasi dari KK baru.
                'data_action' => LetterDataAction::CreateCitizen->value,
                'data_fields' => [
                    ['column' => 'nik', 'label' => 'NIK Anak (dari KK baru)', 'source' => null],
                    ['column' => 'name', 'label' => 'Nama Anak', 'source' => 'nama_anak'],
                    ['column' => 'gender', 'label' => 'Jenis Kelamin (L/P)', 'source' => 'jenis_kelamin_anak'],
                    ['column' => 'place_of_birth', 'label' => 'Tempat Lahir', 'source' => 'tempat_kelahiran'],
                    ['column' => 'date_of_birth', 'label' => 'Tanggal Lahir', 'source' => 'tanggal_lahir_anak'],
                    ['column' => 'family_role', 'label' => 'Hubungan dalam KK', 'value' => 'anak', 'value_label' => 'Anak'],
                    ['column' => 'mother_name_text', 'label' => 'Nama Ibu', 'source' => 'ibu_nama'],
                    ['column' => 'father_name_text', 'label' => 'Nama Ayah', 'source' => 'ayah_nama'],
                ],
                'template' => $this->birthReportForm(),
            ],
            [
                'code' => 'F06',
                'name' => 'Pelaporan Kematian',
                'description' => 'Pelaporan kematian anggota keluarga untuk penerbitan akta kematian di Disdukcapil, serta KK baru bila yang meninggal kepala keluarga.',
                'requirement_info' => 'Siapkan surat keterangan kematian dari dokter/RS/desa, KK dan KTP-el almarhum, serta KTP-el dua orang saksi.',
                'form_fields' => [
                    $this->field('almarhum', 'Anggota Keluarga yang Meninggal', 'family_member', true, null, ['not_self' => true]),
                    [...$this->date('tanggal_kematian', 'Tanggal Kematian'), 'date_order' => [['after' => 'birth:almarhum', 'label' => 'tanggal lahir almarhum']]],
                    $this->time('pukul_kematian', 'Pukul Kematian'),
                    $this->select('sebab_kematian', 'Sebab Kematian', self::DEATH_CAUSE_OPTIONS),
                    $this->text('tempat_kematian', 'Tempat Kematian', true, 'Contoh: RSUD Pandega Pangandaran'),
                    $this->select('yang_menerangkan', 'Yang Menerangkan Kematian', self::DEATH_WITNESS_OPTIONS),
                    // Dua saksi kematian.
                    ...$this->witness(1, 'I', withFamilyNumber: true),
                    ...$this->witness(2, 'II', withFamilyNumber: true),
                    // Wajib bila yang meninggal kepala keluarga (dicek server).
                    $this->field('kepala_baru', 'Kepala Keluarga Baru (isi bila yang meninggal kepala keluarga)', 'family_member', false, null, [
                        'different' => 'almarhum',
                        'required_when_head' => 'almarhum',
                        'empty_label' => 'Yang meninggal bukan kepala keluarga',
                    ]),
                    // Susunan KK tanpa almarhum untuk F-1.01 (disusun sistem).
                    $this->field('kk_baru', 'Susunan KK Baru', 'family_roster', false, null, ['exclude' => 'almarhum', 'head' => 'kepala_baru']),
                ],
                'documents' => [
                    [
                        'key' => 'f1_02',
                        'title' => 'Formulir Pendaftaran Peristiwa Kependudukan (F-1.02)',
                        'when' => self::DECEASED_HEAD,
                        'template' => $this->registrationForm([
                            'kk.baru.ganti_kepala' => true,
                            'lampiran.kk_lama' => true,
                        ]),
                    ],
                    [
                        'key' => 'f1_01',
                        'title' => 'Formulir Biodata Keluarga (F-1.01)',
                        'when' => self::DECEASED_HEAD,
                        'orientation' => 'landscape',
                        'template' => $this->rosterBiodataForm('kk_baru'),
                    ],
                ],
                'result_upload_hint' => 'Kutipan akta kematian dari Disdukcapil, dan KK baru bila yang meninggal kepala keluarga.',
                // Almarhum dinonaktifkan beserta akunnya; penggantian kepala
                // keluarga dikerjakan Kasi di Data KK.
                'data_action' => LetterDataAction::DeactivateMembers->value,
                'data_subject_field' => 'almarhum',
                // Almarhum kepala keluarga: anggota pilihan pemohon menjadi
                // kepala keluarga baru.
                'data_options' => ['new_head' => 'kepala_baru'],
                'data_instructions' => 'Data almarhum dinonaktifkan beserta akunnya. Bila almarhum kepala keluarga, kepala keluarga baru pilihan pemohon ikut ditetapkan.',
                'template' => $this->deathReportForm(),
            ],
            [
                'code' => 'F07',
                'name' => 'Pelaporan Perkawinan/Perceraian',
                'description' => 'Pelaporan perkawinan atau perceraian salah satu pasangan warga desa untuk pencatatan di Disdukcapil dan perubahan status perkawinan di KK.',
                'requirement_info' => 'Siapkan KK, KTP-el suami dan istri, KTP-el dua orang saksi, serta buku nikah/surat perkawinan dari pemuka agama, atau putusan pengadilan bagi perceraian. Bila belum tercatat, SPTJM ditandatangani di atas materai.',
                'form_fields' => [
                    $this->select('peristiwa', 'Peristiwa yang Dilaporkan', self::MARRIAGE_EVENT_OPTIONS),
                    // Dari jenis kelamin pemohon; hanya ditanyakan bila belum tercatat.
                    [
                        ...$this->select('peran_pemohon', 'Anda dalam Peristiwa Ini sebagai', self::SPOUSE_ROLE_OPTIONS),
                        'from_applicant' => ['column' => 'gender', 'map' => ['L' => 'suami', 'P' => 'istri']],
                    ],
                    // Data pemohon diambil dari akunnya; pasangannya diisi lewat NIK.
                    ...$this->spouse('suami', 'Suami'),
                    ...$this->spouse('istri', 'Istri'),
                    // Diisi sistem: No. KK suami dan istri (dari data penduduk) sama.
                    [
                        ...$this->select('pasangan_satu_kk', 'Pasangan Tercatat dalam KK yang Sama', self::YES_NO_OPTIONS, false),
                        'same_value' => ['kk_suami', 'kk_istri'],
                    ],
                    $this->select('status_kawin_belum_tercatat', 'Perkawinan/perceraian ini belum tercatat (belum ada buku nikah/akta, atau perceraian tanpa putusan pengadilan)?', ['tidak' => 'Tidak, sudah tercatat', 'ya' => 'Ya, belum tercatat']),
                    // F-2.01 bagian perkawinan.
                    ...$this->withCondition(self::MARRIAGE, [
                        [...$this->date('tanggal_perkawinan', 'Tanggal Perkawinan/Pemberkatan'), 'date_order' => self::AFTER_SPOUSES_BORN],
                        $this->select('agama_perkawinan', 'Agama', CitizenLabels::RELIGION),
                        $this->text('nama_pemuka_agama', 'Nama Pemuka Agama', false, 'Yang menikahkan/memberkati'),
                        $this->number('perkawinan_ke', 'Perkawinan yang ke-', false, 'Contoh: 1'),
                        ...$this->parents('suami', 'Suami'),
                        ...$this->parents('istri', 'Istri'),
                    ]),
                    [
                        ...$this->text('no_buku_nikah', 'No. Buku Nikah/Kutipan Akta Perkawinan', false, 'Bila sudah ada'),
                        'visible_when' => ['all' => [self::MARRIAGE, self::RECORDED]],
                    ],
                    // F-2.01 bagian perceraian (tercatat: ada putusan pengadilan).
                    ...$this->withCondition(['all' => [self::DIVORCE, self::RECORDED]], [
                        $this->text('no_akta_perkawinan', 'No. Akta Perkawinan/Buku Nikah', true, 'Sesuai buku nikah/akta'),
                        [...$this->date('tanggal_akta_perkawinan', 'Tanggal Akta Perkawinan', false), 'date_order' => self::AFTER_SPOUSES_BORN],
                        $this->text('tempat_pencatatan_perkawinan', 'Tempat Pencatatan Perkawinan', false, 'Contoh: KUA Kec. Parigi'),
                        $this->text('nama_pengadilan', 'Nama Pengadilan', true, 'Contoh: Pengadilan Agama Ciamis'),
                        $this->text('nomor_putusan', 'Nomor Putusan Pengadilan', true, 'Sesuai putusan'),
                        [
                            ...$this->date('tanggal_putusan', 'Tanggal Putusan Pengadilan'),
                            'date_order' => [...self::AFTER_SPOUSES_BORN, ['after' => 'tanggal_akta_perkawinan', 'label' => 'tanggal akta perkawinan']],
                        ],
                        $this->text('nomor_surat_panitera', 'No. Surat Keterangan Panitera', false, 'Bila ada'),
                        [...$this->date('tanggal_surat_panitera', 'Tanggal Surat Keterangan Panitera', false), 'date_order' => [['after' => 'tanggal_putusan', 'label' => 'tanggal putusan pengadilan']]],
                    ]),
                    [
                        ...$this->date('tanggal_perceraian', 'Tanggal Perceraian'),
                        'date_order' => self::AFTER_SPOUSES_BORN,
                        'visible_when' => ['all' => [self::DIVORCE, self::UNRECORDED]],
                    ],
                    ...$this->witness(1, 'I', withFamilyNumber: true, parties: self::SPOUSE_NIK_FIELDS),
                    ...$this->witness(2, 'II', withFamilyNumber: true, parties: self::SPOUSE_NIK_FIELDS),
                    // SPTJM F-1.05 dan F-2.04, hanya bila belum tercatat.
                    ...$this->whenUnrecorded([
                        $this->field('sptjm_anak', 'Anak dari Perkawinan Tersebut', 'repeater', false, null, [
                            'max' => 10,
                            'item_label' => 'anak',
                            'fields' => [
                                $this->text('nama', 'Nama Anak', true, 'Nama lengkap'),
                                $this->text('no_akta', 'No. Akta Kelahiran', false, 'Bila ada'),
                                $this->text('shdk', 'SHDK', true, 'Contoh: Anak'),
                            ],
                        ]),
                    ]),
                    [
                        ...$this->select('perlu_sptjm_pasutri', 'Perlu SPTJM Kebenaran sebagai Pasangan Suami Istri (agar tercantum sebagai suami/istri dalam KK)?', self::YES_NO_OPTIONS),
                        'visible_when' => ['all' => [self::MARRIAGE, self::UNRECORDED]],
                    ],
                    ...$this->withCondition(['field' => 'perlu_sptjm_pasutri', 'equals' => 'ya'], [
                        $this->text('tempat_lahir_pasangan', 'Tempat Lahir Pasangan', true, 'Kota/kabupaten'),
                        [...$this->date('tanggal_lahir_pasangan', 'Tanggal Lahir Pasangan'), 'date_order' => [['before' => 'tanggal_perkawinan', 'label' => 'tanggal perkawinan']]],
                        $this->occupation('pekerjaan_pasangan', 'Pekerjaan Pasangan'),
                        $this->text('alamat_pasangan', 'Alamat Pasangan', true, 'Alamat lengkap'),
                    ]),
                ],
                'documents' => [
                    [
                        'key' => 'f1_06',
                        'title' => 'Surat Pernyataan Perubahan Elemen Data Kependudukan (F-1.06)',
                        'template' => $this->maritalChangeStatement(),
                    ],
                    [
                        'key' => 'f1_05',
                        'title' => 'SPTJM Perkawinan/Perceraian Belum Tercatat (F-1.05)',
                        'when' => self::UNRECORDED,
                        'template' => $this->unrecordedMarriageStatement('peristiwa', '{{ tanggal_perkawinan|tanggal_perceraian }}'),
                    ],
                    [
                        'key' => 'f2_04',
                        'title' => 'SPTJM Kebenaran sebagai Pasangan Suami Istri (F-2.04)',
                        'when' => ['field' => 'perlu_sptjm_pasutri', 'equals' => 'ya'],
                        'template' => $this->spouseStatementForm(),
                    ],
                ],
                'result_upload_hint' => 'Kutipan akta perkawinan/perceraian dan/atau KK terbaru dari Disdukcapil.',
                // Status kawin suami dan istri yang warga desa; pasangan dari
                // luar desa dilewati. Perubahan susunan KK lewat F09.
                'data_action' => LetterDataAction::UpdateCitizens->value,
                'data_options' => ['subjects' => ['nik_suami' => 'Suami', 'nik_istri' => 'Istri']],
                'data_fields' => [
                    ['column' => 'marital_status', 'label' => 'Status Perkawinan', 'source' => 'peristiwa', 'map' => ['perkawinan' => 'kawin', 'perceraian' => 'cerai_hidup']],
                ],
                'template' => $this->marriageReportForm(),
            ],
            [
                'code' => 'F08',
                'name' => 'Pengakuan Anak',
                'description' => 'Pelaporan pengakuan anak oleh ayah biologis (anak dari perkawinan yang sah secara agama tetapi belum tercatat), untuk pencatatan di Disdukcapil.',
                'requirement_info' => 'Siapkan kutipan akta kelahiran anak, KK, KTP-el ayah dan ibu kandung, serta KTP-el dua orang saksi. Surat pernyataan pengakuan anak ditandatangani ayah di atas materai dan disetujui ibu kandung.',
                'form_fields' => [
                    // Anak kepala keluarga, atau cucu/famili lain (mis. tinggal di KK kakek-nenek).
                    $this->field('anak', 'Anak yang Diakui', 'family_member', true, null, ['not_self' => true, 'roles' => ['anak', 'cucu', 'famili_lain']]),
                    $this->text('no_akta_lahir_anak', 'Nomor Akta Kelahiran Anak', true, 'Sesuai kutipan akta kelahiran'),
                    [...$this->date('tanggal_akta_lahir', 'Tanggal Akta Kelahiran', false), 'date_order' => [['after' => 'birth:anak', 'label' => 'tanggal lahir anak']]],
                    $this->text('dinas_akta_lahir', 'Disdukcapil yang Menerbitkan Akta Kelahiran', false, 'Contoh: Kabupaten Pangandaran'),
                    $this->text('alamat_dinas_akta', 'Alamat Disdukcapil Tersebut', false, 'Bila diketahui'),
                    // Perempuan yang cukup tua untuk menjadi ibunya (boleh pemohon sendiri).
                    $this->field('ibu', 'Ibu Kandung Anak', 'family_member', true, null, [
                        'gender' => 'P',
                        'different' => 'anak',
                        'older_than' => ['field' => 'anak', 'years' => self::MOTHER_MIN_AGE_GAP],
                    ]),
                    [
                        ...$this->date('tanggal_perkawinan_agama', 'Tanggal Perkawinan secara Agama', false),
                        'date_order' => [
                            ['after' => 'birth:ibu', 'label' => 'tanggal lahir ibu'],
                            ['after' => 'birth:nik_ayah|tanggal_lahir_ayah', 'label' => 'tanggal lahir ayah'],
                        ],
                    ],
                    // Pemohon laki-laki boleh ayahnya sendiri (data dari akunnya);
                    // pemohon perempuan tidak ditanya.
                    [
                        ...$this->select('pemohon_ayah', 'Apakah Anda Ayah Biologis Anak Ini?', self::YES_NO_OPTIONS),
                        'from_applicant' => ['column' => 'gender', 'map' => ['P' => 'tidak']],
                    ],
                    // Ayah biologis lain: warga desa lewat NIK, selain itu diketik.
                    ...$this->withCondition(self::FATHER_IS_OTHER, [
                        [...$this->field('nik_ayah', 'NIK Ayah Biologis', 'nik', true, '16 digit NIK'), 'self_when' => self::FATHER_IS_APPLICANT],
                        [...$this->text('nama_ayah', 'Nama Ayah Biologis', true, 'Nama lengkap'), 'from_nik' => 'nik_ayah'],
                        $this->text('tempat_lahir_ayah', 'Tempat Lahir Ayah', true, 'Kota/kabupaten'),
                        [...$this->date('tanggal_lahir_ayah', 'Tanggal Lahir Ayah'), 'date_order' => [['before' => 'birth:anak', 'label' => 'tanggal lahir anak']]],
                        $this->occupation('pekerjaan_ayah', 'Pekerjaan Ayah'),
                        $this->text('alamat_ayah', 'Alamat Ayah', true, 'Alamat lengkap'),
                    ]),
                    $this->select('ada_penetapan', 'Ada Penetapan Pengadilan?', self::YES_NO_OPTIONS),
                    ...$this->withCondition(['field' => 'ada_penetapan', 'equals' => 'ya'], [
                        [...$this->date('tanggal_penetapan', 'Tanggal Penetapan Pengadilan'), 'date_order' => [['after' => 'birth:anak', 'label' => 'tanggal lahir anak']]],
                        $this->text('nomor_penetapan', 'Nomor Penetapan Pengadilan', true, 'Sesuai penetapan'),
                        $this->text('nama_pengadilan_penetapan', 'Nama Lembaga Pengadilan', true, 'Contoh: Pengadilan Agama Ciamis'),
                        $this->text('tempat_pengadilan_penetapan', 'Tempat Lembaga Pengadilan', true, 'Contoh: Ciamis'),
                    ]),
                    ...$this->witness(1, 'I', withFamilyNumber: true, parties: ['nik_ayah']),
                    ...$this->witness(2, 'II', withFamilyNumber: true, parties: ['nik_ayah']),
                ],
                'documents' => [
                    ['key' => 'f2_10', 'title' => 'Surat Pernyataan Pengakuan Anak (F-2.10)', 'template' => $this->acknowledgementForm(self::ACKNOWLEDGED_CHILD, fatherFromFamily: false)],
                ],
                'result_upload_hint' => 'Kutipan akta kelahiran yang memuat nama ayah dan KK terbaru dari Disdukcapil.',
                // Nama ayah anak diisi; ditautkan ke data ayah bila warga desa.
                'data_action' => LetterDataAction::UpdateCitizen->value,
                'data_subject_field' => 'anak_nik',
                'data_fields' => [
                    ['column' => 'father_name_text', 'label' => 'Nama Ayah', 'source' => 'nama_ayah'],
                    ['column' => 'father_id', 'label' => 'Data Ayah (warga desa)', 'citizen_by_nik' => 'nik_ayah'],
                ],
                'template' => $this->acknowledgementReportForm(),
            ],
            [
                'code' => 'F09',
                'name' => 'Perubahan Susunan KK',
                'description' => 'Membentuk KK baru (keluarga baru atau pisah KK), mengganti kepala keluarga, atau memasukkan anggota ke KK lain di desa, untuk penerbitan KK baru di Disdukcapil.',
                'requirement_info' => 'Siapkan KK asli (KK lama dan, bila numpang, KK tujuan), KTP-el anggota yang berubah, dan buku nikah/akta perkawinan bila membentuk keluarga baru.',
                'form_fields' => [
                    $this->select('jenis_perubahan', 'Jenis Perubahan Susunan KK', self::RESTRUCTURE_OPTIONS),
                    // KK baru: anggota KK pemohon (+ pasangan dari KK lain) dengan SHDK di KK baru.
                    ...$this->withCondition(self::RESTRUCTURE_NEW, [
                        $this->select('alasan_kk_baru', 'Alasan Membentuk KK Baru', self::NEW_FAMILY_REASON_OPTIONS),
                        $this->field('susunan_baru', 'Anggota KK Anda yang Masuk KK Baru', 'repeater', true, null, [
                            'max' => 10,
                            'item_label' => 'anggota',
                            'one_head' => ['column' => 'shdk', 'with' => 'shdk_pasangan'],
                            'fields' => [
                                $this->field('anggota', 'Anggota Keluarga', 'family_member', true),
                                [...$this->select('shdk', 'Hubungan dalam KK Baru', self::familyRoleOptions()), 'role_of' => 'anggota'],
                            ],
                        ]),
                        // Pasangan warga desa dari KK lain diminta persetujuannya.
                        [
                            ...$this->field('nik_pasangan', 'NIK Pasangan dari KK Lain (bila ada)', 'nik', false, '16 digit NIK'),
                            'witness' => 'Anggota KK Baru',
                            'village_citizen' => true,
                        ],
                        [...$this->text('nama_pasangan', 'Nama Pasangan', false, 'Nama lengkap'), 'from_nik' => 'nik_pasangan'],
                    ]),
                    [
                        ...$this->select('shdk_pasangan', 'Hubungan Pasangan dalam KK Baru', self::familyRoleOptions()),
                        'role_of' => 'nik_pasangan',
                        'visible_when' => ['all' => [self::RESTRUCTURE_NEW, ['field' => 'nik_pasangan', 'filled' => true]]],
                    ],
                    ...$this->withCondition(self::RESTRUCTURE_NEW, [
                        $this->area('alamat_kk_baru', 'Alamat KK Baru di Desa Ini'),
                        $this->field('kepala_baru', 'Kepala Keluarga Baru bagi Anggota yang Tetap di KK Lama', 'family_member', false, null, [
                            'required_when_head' => 'susunan_baru',
                        ]),
                    ]),
                    // Ganti kepala keluarga tanpa ada yang keluar.
                    ...$this->withCondition(self::RESTRUCTURE_HEAD, [
                        $this->field('kepala_pengganti', 'Kepala Keluarga Pengganti', 'family_member', true, null, [
                            'roles' => array_keys(FamilyRole::memberOptions()),
                        ]),
                        [...$this->select('shdk_kepala_lama', 'Hubungan Kepala Keluarga Lama Setelah Diganti', FamilyRole::memberOptions()), 'role_of' => 'family_head'],
                    ]),
                    // Masuk ke KK lain di desa; kepala KK tujuan diminta persetujuannya.
                    ...$this->withCondition(self::RESTRUCTURE_JOIN, [
                        $this->field('anggota_numpang', 'Anggota yang Masuk ke KK Tujuan', 'repeater', true, null, [
                            'max' => 10,
                            'item_label' => 'anggota',
                            'fields' => [
                                $this->field('anggota', 'Anggota Keluarga', 'family_member', true),
                                [...$this->select('shdk', 'Hubungan dalam KK Tujuan', FamilyRole::memberOptions()), 'role_of' => 'anggota'],
                            ],
                        ]),
                        [...$this->field('no_kk_tujuan', 'No. KK Tujuan', 'nik', true, '16 digit No. KK'), 'village_family' => true],
                        [
                            ...$this->field('nik_kepala_tujuan', 'NIK Kepala Keluarga Tujuan', 'nik', false),
                            'family_head_of' => 'no_kk_tujuan',
                            'witness' => 'Kepala KK Tujuan',
                        ],
                        [...$this->text('nama_kepala_tujuan', 'Nama Kepala Keluarga Tujuan', false), 'from_nik' => 'nik_kepala_tujuan'],
                        $this->field('kepala_baru_numpang', 'Kepala Keluarga Baru bagi Anggota yang Tetap di KK Lama', 'family_member', false, null, [
                            'required_when_head' => 'anggota_numpang',
                        ]),
                    ]),
                    // Susunan KK hasil untuk F-1.01 (disusun sistem).
                    $this->field('kk_hasil', 'Susunan KK Hasil', 'family_roster', false, null, ['restructure' => true]),
                ],
                'documents' => [
                    [
                        'key' => 'f1_01',
                        'title' => 'Formulir Biodata Keluarga (F-1.01)',
                        'orientation' => 'landscape',
                        'template' => $this->rosterBiodataForm('kk_hasil', fromRoster: true),
                    ],
                    [
                        'key' => 'numpang_kk',
                        'title' => 'Surat Pernyataan Tidak Keberatan Numpang KK',
                        'when' => self::RESTRUCTURE_JOIN,
                        'template' => $this->joinFamilyStatement(),
                    ],
                ],
                'result_upload_hint' => 'KK baru/terbaru hasil perubahan susunan dari Disdukcapil.',
                // Terapkan: KK baru dibuat (No. KK diisi Kasi), kepala diganti,
                // atau anggota dipindah ke KK tujuan, dengan SHDK barunya.
                // Keluarga baru: kepala keluarga dan suami/istri menjadi Kawin.
                'data_action' => LetterDataAction::RestructureFamily->value,
                'data_options' => [
                    'restructure' => [
                        'kind' => 'jenis_perubahan',
                        'new_family' => ['when' => 'kk_baru', 'rows' => 'susunan_baru', 'partner_nik' => 'nik_pasangan', 'partner_role' => 'shdk_pasangan', 'area' => 'alamat_kk_baru', 'married' => ['field' => 'alasan_kk_baru', 'equals' => 'keluarga_baru']],
                        'change_head' => ['when' => 'ganti_kepala', 'head' => 'kepala_pengganti', 'old_head_role' => 'shdk_kepala_lama'],
                        'join' => ['when' => 'numpang', 'rows' => 'anggota_numpang', 'no_kk' => 'no_kk_tujuan'],
                    ],
                    'new_head' => ['kepala_baru', 'kepala_baru_numpang'],
                ],
                'template' => $this->registrationForm([
                    'kk.baru' => 'jenis_perubahan=kk_baru|ganti_kepala',
                    'kk.baru.keluarga_baru' => 'alasan_kk_baru=keluarga_baru',
                    'kk.baru.pisah' => 'alasan_kk_baru=pisah',
                    'kk.baru.ganti_kepala' => 'jenis_perubahan=ganti_kepala',
                    'kk.ubah.menumpang' => 'jenis_perubahan=numpang',
                    'ubah.kk' => 'jenis_perubahan=ganti_kepala|numpang',
                    'lampiran.kk_lama' => true,
                    'lampiran.buku_nikah' => 'alasan_kk_baru=keluarga_baru',
                    'lampiran.bersedia_menerima' => 'jenis_perubahan=numpang',
                ]),
            ],
        ];
    }

    // ------------------------------------------------------------------
    // Template formulir
    // ------------------------------------------------------------------

    /**
     * Halaman formulir Disdukcapil: kode formulir di kanan atas, judul, isi.
     * Tanpa kop dan nomor surat desa.
     *
     * @param  array<int, string>  $sections
     */
    private function form(string $formCode, string $title, array $sections): string
    {
        $body = implode("\n", $sections);

        return <<<HTML
        <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
            <div style="text-align: right; font-weight: bold;">{$formCode}</div>
            <div style="text-align: center; font-size: 12pt; font-weight: bold; margin: 16px 0 20px;">{$title}</div>
            {$body}
        </div>
        HTML;
    }

    /**
     * Tanda tangan di atas materai (diisi basah setelah dicetak), dengan
     * tempat dan tanggal terbit formulir.
     */
    private function stampedSignature(string $caption, string $name): string
    {
        return <<<HTML
        <table style="width: 100%; margin-top: 24px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p style="margin: 0;">{{ village_regency }}, {{ issued_at }}</p>
                    <p style="margin: 2px 0 0 0;">{$caption}</p>
                    <div style="width: 90px; height: 60px; margin: 8px auto; border: 1px dashed #777; font-size: 8pt; color: #555; display: table;">
                        <span style="display: table-cell; vertical-align: middle;">Materai<br>Cukup</span>
                    </div>
                    <p style="margin: 0; font-weight: bold;">( {$name} )</p>
                </td>
            </tr>
        </table>
        HTML;
    }

    // ------------------------------------------------------------------
    // F02: Perubahan Elemen Data (F-1.06 + F-1.02 + F-1.05)
    // ------------------------------------------------------------------

    /**
     * "Dasar Perubahan" sebuah elemen, wajib bila elemennya diisi.
     */
    private function changeBasis(string $name, string $element, string $placeholder): array
    {
        return [
            ...$this->text($name, 'Dasar Perubahan', true, $placeholder),
            'visible_when' => ['field' => $element, 'filled' => true],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $fields
     * @return array<int, array<string, mixed>>
     */
    private function whenUnrecorded(array $fields): array
    {
        return array_map(
            fn (array $field): array => [...$field, 'visible_when' => ['field' => 'status_kawin_belum_tercatat', 'equals' => 'ya']],
            $fields,
        );
    }

    private function cell(string $html, string $style = ''): string
    {
        return '<td style="border: 1px solid #000; padding: 3px 4px; vertical-align: top; '.$style.'">'.$html.'</td>';
    }

    private function headCell(string $html, string $extra = ''): string
    {
        return '<th style="border: 1px solid #000; padding: 3px 4px; font-weight: bold; text-align: center;" '.$extra.'>'.$html.'</th>';
    }

    /**
     * Tabel bergaris untuk formulir Disdukcapil (font lebih kecil agar muat).
     */
    private function gridTable(string $head, string $body): string
    {
        return '<table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin: 6px 0 12px;">'
            .'<thead>'.$head.'</thead><tbody>'.$body.'</tbody></table>';
    }

    /**
     * Isi sel "Semula / Menjadi / Dasar" sebuah elemen: kosong bila elemen
     * itu tidak berubah pada baris tersebut.
     */
    private function changeCells(string $element, string $current, string $basis): string
    {
        return $this->cell("{{#if {$element}}}{{ {$current} }}{{/if}}")
            .$this->cell("{{#if {$element}}}{{ {$element} }}{{/if}}")
            .$this->cell("{{#if {$element}}}{{ {$basis} }}{{/if}}");
    }

    private function elementChangeStatement(): string
    {
        $changeHead = fn (string $left, string $right): string => $this->changeHead($left, $right);
        $changeRow = fn (string $first, string $second): string => '{{#each perubahan}}<tr>'
            .$this->cell('{{ no }}', 'text-align: center;')
            .$this->cell('{{ anggota_nama }}')
            .$first.$second
            .'</tr>{{/each}}';

        return $this->elementChangeForm(
            $this->gridTable(
                $changeHead('Pendidikan Terakhir', 'Pekerjaan'),
                $changeRow(
                    $this->changeCells('pendidikan_menjadi', 'anggota_pendidikan', 'dasar_pendidikan'),
                    $this->changeCells('pekerjaan_menjadi', 'anggota_pekerjaan', 'dasar_pekerjaan'),
                ),
            ),
            $this->gridTable(
                $changeHead('Agama', 'Lainnya, yaitu: Status Perkawinan'),
                $changeRow(
                    $this->changeCells('agama_menjadi', 'anggota_agama', 'dasar_agama'),
                    $this->changeCells('status_kawin_menjadi', 'anggota_status_kawin', 'dasar_status_kawin'),
                ),
            ),
        );
    }

    /**
     * Kepala tabel perubahan F-1.06: No, Nama, lalu dua elemen masing-masing
     * Semula / Menjadi / Dasar Perubahan.
     */
    private function changeHead(string $left, string $right): string
    {
        return '<tr>'
            .$this->headCell('No', 'rowspan="2"')
            .$this->headCell('Nama', 'rowspan="2"')
            .$this->headCell($left, 'colspan="3"')
            .$this->headCell($right, 'colspan="3"')
            .'</tr><tr>'
            .$this->headCell('Semula').$this->headCell('Menjadi').$this->headCell('Dasar Perubahan')
            .$this->headCell('Semula').$this->headCell('Menjadi').$this->headCell('Dasar Perubahan')
            .'</tr>';
    }

    /**
     * F-1.06 dengan tabel A (pendidikan & pekerjaan) dan B (agama & status
     * perkawinan) yang sudah jadi.
     */
    private function elementChangeForm(string $educationTable, string $religionTable): string
    {
        return $this->form('F-1.06', 'SURAT PERNYATAAN PERUBAHAN ELEMEN DATA KEPENDUDUKAN', [
            $this->rowsBlock('Yang bertanda tangan di bawah ini :', [
                'Nama lengkap' => '{{ applicant_name }}',
                'NIK' => '{{ applicant_nik }}',
                'Nomor KK' => '{{ applicant_family_number }}',
                'Alamat rumah' => '{{ applicant_address }}<br>Desa {{ village_name_short }} Kecamatan {{ village_district }} Kabupaten {{ village_regency }}',
            ], 0),
            '<p style="margin: 8px 0 0;">dengan rincian KK sebagai berikut :</p>',
            $this->gridTable(
                '<tr>'.$this->headCell('No').$this->headCell('Nama').$this->headCell('NIK').$this->headCell('SHDK').$this->headCell('Keterangan').'</tr>',
                '{{#each kk_anggota}}<tr>'.$this->cell('{{ no }}', 'text-align: center;').$this->cell('{{ nama }}').$this->cell('{{ nik }}').$this->cell('{{ shdk }}').$this->cell('').'</tr>{{/each}}',
            ),
            $this->paragraph('Menyatakan bahwa data elemen data kependudukan saya dan anggota keluarga saya telah berubah, dengan rincian:', false),
            '<p style="margin: 8px 0 0; font-weight: bold;">A. Pendidikan dan Pekerjaan:</p>',
            $educationTable,
            '<p style="margin: 8px 0 0; font-weight: bold;">B. Agama dan Perubahan Lainnya:</p>',
            $religionTable,
            $this->paragraph('Terlampir disampaikan fotokopi berkas-berkas yang terkait dengan perubahan elemen data tersebut.', false),
            $this->paragraph('Demikian Surat Pernyataan ini saya buat dengan sebenarnya, apabila dalam keterangan yang saya berikan terdapat hal-hal yang tidak berdasarkan keadaan yang sebenarnya, saya bersedia dikenakan sanksi sesuai ketentuan peraturan perundang-undangan yang berlaku.', false),
            $this->plainSignature('{{ village_name_short }}, {{ issued_at }}', 'Yang membuat pernyataan,', '{{ applicant_name }}', '{{ tanda_tangan_pemohon }}'),
        ]);
    }

    /**
     * Label baris bernomor: nomor di kolom tetap agar label di bawahnya
     * (mis. NIK) sejajar dengan label pertama (Nama), bukan dengan nomornya.
     */
    private function numbered(string $number, string $label): string
    {
        return '<span style="display: inline-block; width: 24px;">'.$number.'</span>'.$label;
    }

    /**
     * F-1.05. $event = isian jenis peristiwa (perkawinan/perceraian), $date =
     * placeholder tanggalnya.
     */
    private function unrecordedMarriageStatement(string $event = 'sptjm_peristiwa', string $date = '{{ sptjm_tanggal }}'): string
    {
        return $this->form('F-1.05', 'SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK<br>PERKAWINAN/ PERCERAIAN BELUM TERCATAT', [
            $this->rowsBlock('Kami yang bertanda tangan di bawah ini&nbsp;:', [
                $this->numbered('I.', 'Nama') => '{{ nama_suami }}',
                $this->numbered('', 'NIK') => '{{ nik_suami }}',
            ], 0),
            '<p style="margin: 0 0 8px;">sebagai suami, selanjutnya disebut PIHAK PERTAMA,</p>',
            $this->rowsBlock(null, [
                $this->numbered('II.', 'Nama') => '{{ nama_istri }}',
                $this->numbered('', 'NIK') => '{{ nik_istri }}',
            ], 0),
            '<p style="margin: 0 0 8px;">sebagai istri, selanjutnya disebut PIHAK KEDUA,</p>',
            $this->paragraph("menyatakan bahwa kami telah melakukan {{#if {$event}=perkawinan}}perkawinan sebagai suami istri{{/if}}{{#if {$event}=perceraian}}perceraian{{/if}}, yang dilaksanakan pada {$date}, dengan saksi-saksi&nbsp;:", false),
            $this->rowsBlock(null, [
                $this->numbered('I.', 'Nama') => '{{ nama_saksi_1 }}',
                $this->numbered('', 'NIK') => '{{ nik_saksi_1 }}',
            ], 0),
            $this->rowsBlock(null, [
                $this->numbered('II.', 'Nama') => '{{ nama_saksi_2 }}',
                $this->numbered('', 'NIK') => '{{ nik_saksi_2 }}',
            ], 0),
            '<p style="margin: 8px 0 0;">Dengan nama anak-anak sebagai berikut&nbsp;:</p>',
            $this->gridTable(
                '<tr>'.$this->headCell('No.').$this->headCell('Nama').$this->headCell('No. Akta Kelahiran').$this->headCell('SHDK').'</tr>',
                '{{#each sptjm_anak}}<tr>'.$this->cell('{{ no }}', 'text-align: center;').$this->cell('{{ nama }}').$this->cell('{{#if no_akta}}{{ no_akta }}{{/if}}').$this->cell('{{ shdk }}').'</tr>{{/each}}',
            ),
            $this->paragraph('Demikian Surat Pernyataan ini kami buat dengan sebenarnya, apabila dalam keterangan yang kami berikan terdapat hal-hal yang tidak berdasarkan keadaan yang sebenarnya, kami bersedia dikenakan sanksi sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.', false),
            <<<'HTML'
            <p style="margin: 16px 0 4px; text-align: center;">{{ village_regency }}, {{ issued_at }}<br>Yang menyatakan,</p>
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">PIHAK KEDUA,<div style="height: 60px;"></div>{{ tanda_tangan_pemohon_bila_nik_istri }}( {{ nama_istri }} )</td>
                    <td style="width: 50%; vertical-align: top;">PIHAK PERTAMA,
                        <div style="width: 90px; height: 50px; margin: 5px auto; border: 1px dashed #777; font-size: 8pt; color: #555; display: table;"><span style="display: table-cell; vertical-align: middle;">Materai<br>Cukup</span></div>
                        {{ tanda_tangan_pemohon_bila_nik_suami }}( {{ nama_suami }} )</td>
                </tr>
                <tr>
                    <td style="padding-top: 16px; vertical-align: top;">SAKSI II,<div style="height: 50px;"></div>( {{ nama_saksi_2 }} )</td>
                    <td style="padding-top: 16px; vertical-align: top;">SAKSI I,<div style="height: 50px;"></div>( {{ nama_saksi_1 }} )</td>
                </tr>
            </table>
            HTML,
        ]);
    }

    // ------------------------------------------------------------------
    // F03: Pindah Keluar (F-1.03 + F-1.02)
    // ------------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $condition
     * @param  array<int, array<string, mixed>>  $fields
     * @return array<int, array<string, mixed>>
     */
    private function withCondition(array $condition, array $fields): array
    {
        return array_map(fn (array $field): array => [...$field, 'visible_when' => $condition], $fields);
    }

    /**
     * Pilihan bercentang: satu kotak per opsi, tercentang bila isian
     * bernilai opsi itu.
     *
     * @param  array<string, string>  $options
     */
    private function choices(string $field, array $options, int $columns = 1): string
    {
        $cells = array_map(
            fn (string $value, string $label): string => '<td style="vertical-align: top; padding: 1px 8px 1px 0;">'.$this->checkbox("{$field}={$value}").$label.'</td>',
            array_keys($options),
            $options,
        );
        $rows = '';

        foreach (array_chunk($cells, $columns) as $chunk) {
            $rows .= '<tr>'.implode('', $chunk).'</tr>';
        }

        return '<table style="border-collapse: collapse;">'.$rows.'</table>';
    }

    /**
     * Isi formulir yang boleh kosong: dicetak kosong (bukan garis isian)
     * bila tidak diisi, agar bagian formulir yang tidak dipakai tetap tampil.
     */
    private function blank(string $field): string
    {
        return "{{#if {$field}}}{{ {$field} }}{{/if}}";
    }

    /**
     * Data pemohon pindah: warga desa dari data pemohon, orang asing dari isian.
     */
    private function mover(string $citizen, string $foreigner): string
    {
        $foreignerValue = $foreigner === 'alamat_wna_dusun' ? 'Dusun '.$this->blank($foreigner) : $this->blank($foreigner);

        return "{{#if kewarganegaraan=wni}}{$citizen}{{/if}}{{#if kewarganegaraan=wna}}{$foreignerValue}{{/if}}";
    }

    private function moveOutForm(): string
    {
        $row = fn (string $no, string $label, string $value): string => '<tr>'
            .'<td style="width: 24px; vertical-align: top; padding: 3px 0;">'.$no.'</td>'
            .'<td style="width: 180px; vertical-align: top; padding: 3px 0;">'.$label.'</td>'
            .'<td style="width: 12px; vertical-align: top; padding: 3px 0;">:</td>'
            .'<td style="vertical-align: top; padding: 3px 0;">'.$value.'</td>'
            .'</tr>';
        $table = fn (string $rows): string => '<table style="width: 100%; border-collapse: collapse;">'.$rows.'</table>';
        $region = fn (string $desa, string $kecamatan, string $kabupaten, string $provinsi, string $kodePos): string => '<table style="width: 100%; border-collapse: collapse;">'
            .'<tr><td style="width: 50%; padding: 1px 0;">a. Desa/Kelurahan : '.$desa.'</td><td style="padding: 1px 0;">b. Kecamatan : '.$kecamatan.'</td></tr>'
            .'<tr><td style="padding: 1px 0;">c. Kabupaten/Kota : '.$kabupaten.'</td><td style="padding: 1px 0;">d. Provinsi : '.$provinsi.'</td></tr>'
            .'<tr><td style="padding: 1px 0;" colspan="2">Kode Pos : '.$kodePos.'</td></tr></table>';
        $section = fn (string $title): string => '<p style="margin: 12px 0 4px; font-weight: bold;">'.$title.'</p>';
        $requests = '<table style="border-collapse: collapse;">'
            .'<tr><td style="padding: 1px 0;">'.$this->checkbox('jenis_permohonan=skp').'Surat Keterangan Pindah</td></tr>'
            .'<tr><td style="padding: 1px 0;">'.$this->checkbox('jenis_permohonan=skpln').'Surat Keterangan Pindah Luar Negeri (SKPLN)</td></tr>'
            .'<tr><td style="padding: 1px 0;">'.$this->checkbox('kewarganegaraan=wna').'Surat Keterangan Tempat Tinggal (SKTT)<br><span style="padding-left: 17px;">Bagi Orang Asing Tinggal Terbatas</span></td></tr>'
            .'</table>';
        $memberRow = fn (string $nik): string => '<tr>'.$this->cell('{{ no }}', 'text-align: center; width: 30px;').$this->cell($nik).$this->cell('{{ nama }}').$this->cell('{{ shdk }}').'</tr>';

        return $this->form('F-1.03', 'FORMULIR PENDAFTARAN PERPINDAHAN PENDUDUK', [
            $table(
                $row('1.', 'No KK', $this->mover('{{ applicant_family_number }}', 'no_kk_wna'))
                .$row('2.', 'Nama Lengkap Pemohon', $this->mover('{{ applicant_name }}', 'nama_wna'))
                .$row('3.', 'NIK', $this->mover('{{ applicant_nik }}', 'nik_wna'))
                .$row('4.', 'Jenis Permohonan', $requests)
                .$row('5.', 'Alamat Jelas', $this->mover('{{ applicant_address }}', 'alamat_wna_dusun')
                    .'{{#if kewarganegaraan=wna}} RT '.$this->blank('alamat_wna_rt').' RW '.$this->blank('alamat_wna_rw').'{{/if}}'
                    .$region('{{ village_name_short }}', '{{ village_district }}', '{{ village_regency }}', '{{ village_province }}', '{{ village_postal_code }}')
                    .$this->choices('klasifikasi_pindah', self::MOVE_CLASSIFICATION_OPTIONS))
                .$row('6.', 'Alamat Pindah', $this->blank('alamat_tujuan').' RT '.$this->blank('rt_tujuan').' RW '.$this->blank('rw_tujuan')
                    .$region($this->blank('desa_tujuan'), $this->blank('kecamatan_tujuan'), $this->blank('kabupaten_tujuan'), $this->blank('provinsi_tujuan'), $this->blank('kode_pos_tujuan')))
                .$row('7.', 'Alasan Pindah', $this->choices('alasan_pindah', self::MOVE_REASON_OPTIONS, 3)
                    .'<div>Lainnya (sebutkan) : '.$this->blank('alasan_lainnya').'</div>')
                .$row('8.', 'Jenis Kepindahan', $this->choices('jenis_kepindahan', self::MOVE_TYPE_OPTIONS, 2))
                .$row('9.', 'Anggota Keluarga Tidak Pindah', $this->choices('status_tidak_pindah', self::MOVE_KK_STATUS_OPTIONS, 2))
                .$row('10.', 'Anggota Keluarga Yang Pindah', $this->choices('status_pindah', self::MOVE_KK_STATUS_OPTIONS, 2))
                .$row('11.', 'Daftar Anggota Keluarga Yang Pindah', ''),
            ),
            $this->gridTable(
                '<tr>'.$this->headCell('NO.').$this->headCell('NIK').$this->headCell('NAMA LENGKAP').$this->headCell('SHDK').'</tr>',
                '{{#each anggota_pindah}}'.$memberRow('{{ nik }}').'{{/each}}'
                .'{{#each anggota_wna}}'.$memberRow('{{#if nik}}{{ nik }}{{/if}}').'{{/each}}',
            ),
            $section('Diisi oleh Penduduk (Orang Asing) pemegang ITAS yang Mengajukan SKTT dan OA Pemegang SKTT dan OA Pemegang ITAP yang Mengajukan Surat Keterangan Kependudukan Lainnya'),
            $table(
                $row('12.', 'Nama Sponsor', $this->blank('nama_sponsor'))
                .$row('13.', 'Tipe Sponsor', $this->choices('tipe_sponsor', self::SPONSOR_TYPE_OPTIONS, 3))
                .$row('14.', 'Alamat Sponsor', $this->blank('alamat_sponsor'))
                .$row('15.', 'Nomor dan Tanggal ITAS &amp; ITAP', 'Nomor : '.$this->blank('nomor_itas').'<br>Tanggal Masa Berlaku : '.$this->blank('tanggal_itas')),
            ),
            $section('Diisi oleh Penduduk yang Mengajukan Surat Keterangan Pindah Luar Negeri'),
            $table(
                $row('16.', 'Negara Tujuan', $this->blank('negara_tujuan'))
                .$row('17.', 'Alamat Tujuan', $this->blank('alamat_luar_negeri'))
                .$row('18.', 'Penanggung Jawab', $this->blank('penanggung_jawab'))
                .$row('19.', 'Rencana Pindah Tanggal', $this->blank('rencana_tanggal_pindah')),
            ),
            '<table style="width: 100%; margin-top: 20px; border-collapse: collapse; text-align: center;"><tr>'
            .'<td style="width: 50%; vertical-align: top;">Mengetahui,<br>Kepala Dinas Kependudukan dan<br>Pencatatan Sipil {{ village_regency }},<div style="height: 60px;"></div>(.............................................)</td>'
            .'<td style="width: 50%; vertical-align: top;">{{ village_name_short }}, {{ issued_at }}<br>Pemohon,<br>&nbsp;<div style="height: 60px;"></div>{{#if kewarganegaraan=wni}}{{ tanda_tangan_pemohon }}{{/if}}( '.$this->mover('{{ applicant_name }}', 'nama_wna').' )</td>'
            .'</tr></table>',
        ]);
    }

    // ------------------------------------------------------------------
    // F04: Pindah Datang (F-1.02 + satu surat pernyataan Pendatang + F-1.01)
    // ------------------------------------------------------------------

    /**
     * Identitas bertitik dua tanpa indentasi (surat pernyataan Pendatang).
     *
     * @param  array<string, string>  $rows
     */
    private function identity(array $rows): string
    {
        return $this->rowsBlock(null, $rows, 20);
    }

    /**
     * Tanda tangan surat pernyataan Pendatang: diketahui Ketua RT dan RW
     * wilayah pendatang di kiri, yang menyatakan di kanan (dengan/tanpa
     * materai). TTD yang menyatakan ditempel bila ia pemohonnya ($nik).
     */
    private function arrivalSignature(string $name, bool $stamped, string $nik): string
    {
        $stamp = $stamped
            ? '<div style="width: 90px; height: 50px; margin: 6px auto; border: 1px dashed #777; font-size: 8pt; color: #555; display: table;"><span style="display: table-cell; vertical-align: middle;">Materai<br>Cukup</span></div>'
            : '<div style="height: 62px;"></div>';
        $official = fn (string $title, string $level): string => '<p style="margin: 0;">'.$title.'</p><div style="height: 50px;"></div>'
            ."{{ tanda_tangan_{$level}_alamat_pendatang }}"
            ."<p style=\"margin: 0;\">( {{ pejabat_{$level}_alamat_pendatang_nama }} )</p><p style=\"margin: 0 0 12px;\">NIK. {{ pejabat_{$level}_alamat_pendatang_nik }}</p>";

        return <<<HTML
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%; vertical-align: top; text-align: center;">
                    <p style="margin: 0;">Mengetahui :</p>
                    {$official('Ketua RT {{ alamat_pendatang_rt }}', 'rt')}
                    {$official('Ketua RW {{ alamat_pendatang_rw }}', 'rw')}
                </td>
                <td style="width: 50%; vertical-align: top; text-align: center;">
                    <p style="margin: 0;">{{ village_regency }}, {{ issued_at }}</p>
                    <p style="margin: 0;">Saya yang menyatakan,</p>
                    {$stamp}
                    {{ tanda_tangan_pemohon_bila_{$nik} }}<p style="margin: 0; font-weight: bold;">( {$name} )</p>
                </td>
            </tr>
        </table>
        HTML;
    }

    /**
     * Identitas pendatang (nama, NIK, TTL, agama, pekerjaan).
     */
    private function arrivalIdentity(): string
    {
        return $this->identity([
            'Nama' => '{{ nama_pendatang }}',
            'NIK' => '{{ nik_pendatang }}',
            'Tempat dan Tgl. lahir' => '{{ tempat_lahir_pendatang }}, {{ tanggal_lahir_pendatang }}',
            'Agama' => '{{ agama_pendatang }}',
            'Pekerjaan' => '{{ pekerjaan_pendatang }}',
        ]);
    }

    private function hostFamilyStatement(): string
    {
        return $this->form('', 'SURAT PERNYATAAN<br>TIDAK KEBERATAN NUMPANG KK', [
            '<p style="margin: 0 0 6px;">Saya yang bertanda tangan di bawah ini&nbsp;:</p>',
            $this->identity([
                'Nama' => '{{ nama_kepala_keluarga }}',
                'NIK' => '{{ nik_kepala_keluarga }}',
                'No. KK' => '{{ no_kk_tujuan }}',
                'Pekerjaan' => '{{ pekerjaan_kepala_keluarga }}',
                'Alamat' => 'Dusun {{ alamat_kepala_keluarga_dusun }} RT {{ alamat_kepala_keluarga_rt }} RW {{ alamat_kepala_keluarga_rw }}',
            ]),
            $this->paragraph('Selaku Kepala Keluarga, dengan ini menyatakan tidak keberatan dalam Kartu Keluarga saya dimasukkan orang tersebut di bawah ini&nbsp;:', false),
            $this->arrivalIdentity(),
            $this->paragraph('Demikian surat pernyataan ini saya buat dengan sebenar-benarnya dan tanpa paksaan dari pihak manapun, untuk dipergunakan sebagaimana mestinya.', false),
            $this->arrivalSignature('{{ nama_kepala_keluarga }}', true, 'nik_kepala_keluarga'),
        ]);
    }

    private function ownHomeStatement(): string
    {
        return $this->form('', 'SURAT PERNYATAAN<br>MENGGUNAKAN ALAMAT RUMAH MILIK SENDIRI', [
            '<p style="margin: 0 0 6px;">Saya yang bertanda tangan di bawah ini&nbsp;:</p>',
            $this->identity([
                'Nama' => '{{ nama_pendatang }}',
                'NIK' => '{{ nik_pendatang }}',
                'Tempat dan Tgl. lahir' => '{{ tempat_lahir_pendatang }}, {{ tanggal_lahir_pendatang }}',
                'Agama' => '{{ agama_pendatang }}',
                'Pekerjaan' => '{{ pekerjaan_pendatang }}',
                'Alamat' => 'Dusun {{ alamat_pendatang_dusun }} RT {{ alamat_pendatang_rt }} RW {{ alamat_pendatang_rw }}, Desa {{ village_name_short }}',
            ]),
            $this->paragraph('Dengan ini menyatakan bahwa alamat yang dipergunakan dalam dokumen kependudukan sesuai alamat kepindahan adalah milik sendiri/ milik orang tua.', false),
            $this->paragraph('Demikian surat pernyataan ini saya buat dengan sebenar-benarnya dan tanpa paksaan dari pihak manapun, untuk dipergunakan sebagaimana mestinya.', false),
            $this->arrivalSignature('{{ nama_pendatang }}', false, 'nik_pendatang'),
        ]);
    }

    private function hostAddressStatement(): string
    {
        return $this->form('', 'SURAT PERNYATAAN<br>ALAMAT DIGUNAKAN DALAM ADMINISTRASI KEPENDUDUKAN', [
            '<p style="margin: 0 0 6px;">Saya yang bertanda tangan di bawah ini&nbsp;:</p>',
            $this->identity([
                'Nama' => '{{ nama_pemilik }}',
                'NIK' => '{{ nik_pemilik }}',
                'Tempat/Tanggal Lahir' => '{{ tempat_lahir_pemilik }}, {{ tanggal_lahir_pemilik }}',
                'Pekerjaan' => '{{ pekerjaan_pemilik }}',
                'Alamat' => '{{ alamat_pemilik }}',
            ]),
            '<p style="margin: 8px 0 6px;">Selaku pemilik {{ jenis_tempat }} yang berlokasi di&nbsp;:</p>',
            $this->identity([
                'RT / RW' => '{{ alamat_pendatang_rt }} / {{ alamat_pendatang_rw }}',
                'Dusun/Lingkungan' => '{{ alamat_pendatang_dusun }}',
                'Desa/Kelurahan' => '{{ village_name_short }}',
                'Kecamatan' => '{{ village_district }}',
                'Kota' => '{{ village_regency }}',
            ]),
            $this->paragraph('Dengan ini menyatakan tidak keberatan alamat tersebut dipergunakan sebagai alamat tinggal dalam dokumen kependudukan bagi orang tersebut di bawah ini&nbsp;:', false),
            $this->arrivalIdentity(),
            $this->paragraph('Demikian surat pernyataan ini saya buat dengan sebenar-benarnya dan tanpa paksaan dari pihak manapun, untuk dipergunakan sebagaimana mestinya.', false),
            $this->arrivalSignature('{{ nama_pemilik }}', true, 'nik_pemilik'),
        ]);
    }

    /**
     * F-1.01 bagi pendatang yang membuat KK baru: pendatang sebagai kepala
     * keluarga dan satu-satunya anggota.
     */
    private function arrivalBiodataForm(): string
    {
        return $this->biodataForm(
            [
                'head' => '{{ nama_pendatang }}',
                'address' => 'DUSUN {{ alamat_pendatang_dusun }}',
                'hamlet' => '{{ alamat_pendatang_dusun }}',
                'count' => '1',
            ],
            // Kotak per karakter: nama placeholder sumbernya.
            [
                'postal' => 'village_postal_code',
                'rt' => 'alamat_pendatang_rt',
                'rw' => 'alamat_pendatang_rw',
                'phone' => 'telepon_pendatang',
            ],
            [[
                'name' => '{{ nama_pendatang }}',
                'gender' => '{{ jenis_kelamin_pendatang }}',
                'birth_place' => '{{ tempat_lahir_pendatang }}',
                'birth_date' => '{{ tanggal_lahir_pendatang }}',
                'nationality' => 'INDONESIA',
                'birth_certificate' => '{{#if no_akta_lahir}}Ada{{/if}}',
                'birth_certificate_number' => $this->blank('no_akta_lahir'),
                'blood_type' => $this->blank('golongan_darah_pendatang'),
                'religion' => '{{ agama_pendatang }}',
                'marital_status' => '{{ status_kawin_pendatang }}',
                'marriage_certificate' => '{{#if no_akta_kawin}}Ada{{/if}}',
                'marriage_certificate_number' => $this->blank('no_akta_kawin'),
                'marriage_date' => $this->blank('tanggal_kawin'),
                'divorce_certificate' => '{{#if no_akta_cerai}}Ada{{/if}}',
                'divorce_certificate_number' => $this->blank('no_akta_cerai'),
                'divorce_date' => $this->blank('tanggal_cerai'),
                'family_role' => 'Kepala Keluarga',
                'education' => '{{ pendidikan_pendatang }}',
                'occupation' => '{{ pekerjaan_pendatang }}',
                'mother_nik' => $this->blank('nik_ibu_pendatang'),
                'mother_name' => '{{ nama_ibu_pendatang }}',
                'father_nik' => $this->blank('nik_ayah_pendatang'),
                'father_name' => '{{ nama_ayah_pendatang }}',
            ]],
        );
    }

    // ------------------------------------------------------------------
    // F07: Pelaporan Perkawinan/Perceraian (F-2.01 + F-1.06 + F-1.05 + F-2.04)
    // ------------------------------------------------------------------

    /**
     * NIK, nama, dan No. KK suami/istri. Bila pemohon sendiri yang
     * berperan itu, isiannya disembunyikan dan diisi dari data pemohon
     * (`self_when`); pasangannya diisi lewat NIK (warga desa: nama dan
     * No. KK otomatis, selain itu diketik).
     *
     * @return array<int, array<string, mixed>>
     */
    private function spouse(string $role, string $label): array
    {
        $partner = ['field' => 'peran_pemohon', 'equals' => $role === 'suami' ? 'istri' : 'suami'];

        return $this->withCondition($partner, [
            [...$this->field("nik_{$role}", "NIK {$label}", 'nik', true, '16 digit NIK'), 'self_when' => ['field' => 'peran_pemohon', 'equals' => $role]],
            [...$this->text("nama_{$role}", "Nama {$label}", true, 'Nama lengkap'), 'from_nik' => "nik_{$role}"],
            [
                ...$this->field("kk_{$role}", "No. KK {$label}", 'nik', false, '16 digit No. KK'),
                'from_nik' => "nik_{$role}",
                'from_nik_value' => 'family_number',
            ],
        ]);
    }

    /**
     * Orang tua suami/istri untuk F-2.01 bagian perkawinan.
     *
     * @return array<int, array<string, mixed>>
     */
    private function parents(string $role, string $label): array
    {
        return [
            $this->text("nama_ayah_{$role}", "Nama Ayah dari {$label}", true, 'Nama lengkap'),
            $this->field("nik_ayah_{$role}", "NIK Ayah dari {$label}", 'nik', false, 'Bila ada'),
            $this->text("nama_ibu_{$role}", "Nama Ibu dari {$label}", true, 'Nama lengkap'),
            $this->field("nik_ibu_{$role}", "NIK Ibu dari {$label}", 'nik', false, 'Bila ada'),
        ];
    }

    /**
     * Nilai isian pasangan pemohon: `<kolom>_istri` bila pemohon suami,
     * `<kolom>_suami` bila pemohon istri.
     */
    private function partner(string $column): string
    {
        return "{{#if peran_pemohon=suami}}{{ {$column}_istri }}{{/if}}{{#if peran_pemohon=istri}}{{ {$column}_suami }}{{/if}}";
    }

    /**
     * F-2.01 bagian perkawinan atau perceraian; subjek akta kesatu suami,
     * kedua istri. Bagian peristiwa yang tidak dipilih tercetak kosong.
     */
    private function marriageReportForm(): string
    {
        $date = fn (string $prefix, string $field): array => [
            "{$prefix}_tgl" => "{$field}_tgl",
            "{$prefix}_bln" => "{$field}_bln",
            "{$prefix}_thn" => "{$field}_thn",
        ];
        $religions = array_combine(array_keys(CitizenLabels::RELIGION), array_keys(CitizenLabels::RELIGION));
        // Kotak agama di F-2.01 bernama "budha".
        $religions = ['budha' => $religions['buddha']] + array_diff_key($religions, ['buddha' => true]);

        return $this->sheetForm('f2_01_pelaporan_capil', [
            ...$this->capilHeader('perkawinan'),
            'jenis_perkawinan' => '{{#if peristiwa=perkawinan}}X{{/if}}',
            'jenis_perceraian' => '{{#if peristiwa=perceraian}}X{{/if}}',
            ...$this->ticks('kawin_agama', 'agama_perkawinan', $religions),
            'kawin_ke' => $this->blank('perkawinan_ke'),
        ], [
            ...$this->capilWitnessBoxes(),
            'subjek1_nama' => 'nama_suami',
            'subjek1_nik' => 'nik_suami',
            'subjek1_kk' => 'kk_suami',
            'subjek1_kwn' => '=INDONESIA',
            'subjek2_nama' => 'nama_istri',
            'subjek2_nik' => 'nik_istri',
            'subjek2_kk' => 'kk_istri',
            'subjek2_kwn' => '=INDONESIA',
            'kawin_ayah_suami_nik' => 'nik_ayah_suami',
            'kawin_ayah_suami_nama' => 'nama_ayah_suami',
            'kawin_ibu_suami_nik' => 'nik_ibu_suami',
            'kawin_ibu_suami_nama' => 'nama_ibu_suami',
            'kawin_ayah_istri_nik' => 'nik_ayah_istri',
            'kawin_ayah_istri_nama' => 'nama_ayah_istri',
            'kawin_ibu_istri_nik' => 'nik_ibu_istri',
            'kawin_ibu_istri_nama' => 'nama_ibu_istri',
            'kawin_hari' => 'tanggal_perkawinan_namahari',
            ...$date('kawin_tanggal', 'tanggal_perkawinan'),
            'kawin_pemuka' => 'nama_pemuka_agama',
            'cerai_akta_kawin' => 'no_akta_perkawinan',
            ...$date('cerai_akta_kawin_tanggal', 'tanggal_akta_perkawinan'),
            'cerai_tempat_kawin' => 'tempat_pencatatan_perkawinan',
            'cerai_pengadilan' => 'nama_pengadilan',
            ...$date('cerai_putusan_tanggal', 'tanggal_putusan'),
            'cerai_putusan_no' => 'nomor_putusan',
            'cerai_panitera_no' => 'nomor_surat_panitera',
            ...$date('cerai_panitera_tanggal', 'tanggal_surat_panitera'),
        ]);
    }

    /**
     * F-1.06 untuk F07: status perkawinan pemohon (dan pasangannya bila satu
     * KK) berubah menjadi Kawin / Cerai Hidup.
     */
    private function maritalChangeStatement(): string
    {
        $people = fn (callable $cells): string => '<tr>'.$this->cell('1', 'text-align: center;').$this->cell('{{ applicant_name }}').$cells().'</tr>'
            .'{{#if pasangan_satu_kk=ya}}<tr>'.$this->cell('2', 'text-align: center;').$this->cell($this->partner('nama')).$cells().'</tr>{{/if}}';
        $empty = fn (int $count): string => str_repeat($this->cell(''), $count);
        $becomes = '{{#if peristiwa=perkawinan}}Kawin{{/if}}{{#if peristiwa=perceraian}}Cerai Hidup{{/if}}';
        $basis = '{{#if status_kawin_belum_tercatat=ya}}SPTJM Perkawinan/Perceraian Belum Tercatat (F-1.05){{/if}}'
            .'{{#if status_kawin_belum_tercatat=tidak}}'
            .'{{#if peristiwa=perkawinan}}Pelaporan Perkawinan (F-2.01){{#if no_buku_nikah}}, Buku Nikah/Akta No. {{ no_buku_nikah }}{{/if}}{{/if}}'
            .'{{#if peristiwa=perceraian}}Putusan {{ nama_pengadilan }} No. {{ nomor_putusan }}{{/if}}'
            .'{{/if}}';

        return $this->elementChangeForm(
            $this->gridTable($this->changeHead('Pendidikan Terakhir', 'Pekerjaan'), $people(fn (): string => $empty(6))),
            $this->gridTable(
                $this->changeHead('Agama', 'Lainnya, yaitu: Status Perkawinan'),
                $people(fn (): string => $empty(3).$this->cell('{{ applicant_marital_status }}').$this->cell($becomes).$this->cell($basis)),
            ),
        );
    }

    /**
     * F-2.04: pemohon menyatakan pasangannya adalah suami/isterinya
     * sebagaimana tercantum dalam KK pemohon.
     */
    private function spouseStatementForm(): string
    {
        return $this->sheetForm('f2_04_sptjm_pasutri', [
            'penyata_nama' => '{{ applicant_name }}',
            'penyata_nik' => '{{ applicant_nik }}',
            'penyata_ttl' => '{{ applicant_birth_place_date }}',
            'penyata_pekerjaan' => '{{ applicant_occupation }}',
            'penyata_alamat' => '{{ applicant_address }}',
            'pasangan_nama' => $this->partner('nama'),
            'pasangan_nik' => $this->partner('nik'),
            'pasangan_ttl' => '{{ tempat_lahir_pasangan }}, {{ tanggal_lahir_pasangan }}',
            'pasangan_pekerjaan' => '{{ pekerjaan_pasangan }}',
            'pasangan_alamat' => '{{ alamat_pasangan }}',
            'pasangan_peran' => '{{#if peran_pemohon=suami}}isteri{{/if}}{{#if peran_pemohon=istri}}suami{{/if}}',
            'family_number' => '{{ applicant_family_number }}',
            'place_date' => '{{ village_regency }}, {{ issued_at }}',
            'penyata_sign' => '{{ tanda_tangan_pemohon }}{{ applicant_name }}',
            'saksi1_nama' => '{{ nama_saksi_1 }}',
            'saksi1_nik' => '{{ nik_saksi_1 }}',
            'saksi2_nama' => '{{ nama_saksi_2 }}',
            'saksi2_nik' => '{{ nik_saksi_2 }}',
        ]);
    }

    // ------------------------------------------------------------------
    // F09: Perubahan Susunan KK (F-1.02 + F-1.01)
    // ------------------------------------------------------------------

    /**
     * Semua SHDK, [nilai => label].
     *
     * @return array<string, string>
     */
    private static function familyRoleOptions(): array
    {
        return array_combine(
            array_map(fn (FamilyRole $role): string => $role->value, FamilyRole::cases()),
            array_map(fn (FamilyRole $role): string => $role->label(), FamilyRole::cases()),
        );
    }

    /**
     * Pernyataan kepala KK tujuan bahwa tidak keberatan anggota KK pemohon
     * dimasukkan ke KK-nya.
     */
    private function joinFamilyStatement(): string
    {
        return $this->form('', 'SURAT PERNYATAAN<br>TIDAK KEBERATAN NUMPANG KK', [
            '<p style="margin: 0 0 6px;">Saya yang bertanda tangan di bawah ini&nbsp;:</p>',
            $this->identity([
                'Nama' => '{{ nama_kepala_tujuan }}',
                'NIK' => '{{ nik_kepala_tujuan }}',
                'No. KK' => '{{ no_kk_tujuan }}',
                'Alamat' => '{{ kk_hasil_alamat }}, Desa {{ village_name_short }}',
            ]),
            $this->paragraph('Selaku Kepala Keluarga, dengan ini menyatakan tidak keberatan dalam Kartu Keluarga saya dimasukkan anggota keluarga berikut&nbsp;:', false),
            $this->gridTable(
                '<tr>'.$this->headCell('No').$this->headCell('Nama').$this->headCell('NIK').$this->headCell('Hubungan dalam KK').'</tr>',
                '{{#each anggota_numpang}}<tr>'.$this->cell('{{ no }}', 'text-align: center;').$this->cell('{{ anggota_nama }}').$this->cell('{{ anggota_nik }}').$this->cell('{{ shdk }}').'</tr>{{/each}}',
            ),
            $this->paragraph('Demikian surat pernyataan ini saya buat dengan sebenar-benarnya dan tanpa paksaan dari pihak manapun, untuk dipergunakan sebagaimana mestinya.', false),
            $this->stampedSignature('Yang menyatakan,', '{{ nama_kepala_tujuan }}'),
        ]);
    }

    // ------------------------------------------------------------------
    // F08: Pengakuan Anak (F-2.01 + F-2.10)
    // ------------------------------------------------------------------

    /**
     * F-2.01 bagian pengakuan anak: subjek akta anak yang diakui, data akta
     * kelahirannya, ibu dan ayah kandung, dan penetapan pengadilan bila ada.
     */
    private function acknowledgementReportForm(): string
    {
        $date = fn (string $prefix, string $field): array => [
            "{$prefix}_tgl" => "{$field}_tgl",
            "{$prefix}_bln" => "{$field}_bln",
            "{$prefix}_thn" => "{$field}_thn",
        ];

        return $this->sheetForm('f2_01_pelaporan_capil', $this->capilHeader('akui_anak'), [
            ...$this->capilWitnessBoxes(),
            'subjek1_nama' => 'anak_nama',
            'subjek1_nik' => 'anak_nik',
            'subjek1_kk' => 'applicant_family_number',
            'subjek1_kwn' => '=INDONESIA',
            'akui_akta' => 'no_akta_lahir_anak',
            ...$date('akui_akta_tanggal', 'tanggal_akta_lahir'),
            'akui_dinas' => 'dinas_akta_lahir',
            'akui_lahir_tgl' => 'anak_lahir_tgl',
            'akui_lahir_bln' => 'anak_lahir_bln',
            'akui_lahir_thn' => 'anak_lahir_thn',
            ...$date('akui_kawin', 'tanggal_perkawinan_agama'),
            'akui_ibu_nama' => 'ibu_nama',
            'akui_ibu_nik' => 'ibu_nik',
            'akui_ibu_kwn' => '=INDONESIA',
            'akui_ayah_nama' => 'nama_ayah',
            'akui_ayah_nik' => 'nik_ayah',
            'akui_ayah_kwn' => '=INDONESIA',
            ...$date('akui_penetapan', 'tanggal_penetapan'),
            'akui_penetapan_no' => 'nomor_penetapan',
            'akui_lembaga' => 'nama_pengadilan_penetapan',
            'akui_lembaga_tempat' => 'tempat_pengadilan_penetapan',
        ]);
    }

    // ------------------------------------------------------------------
    // F05: Pelaporan Kelahiran (F-2.01 + F-2.03 + F-2.10)
    // ------------------------------------------------------------------

    /**
     * Formulir dari templates/<file>.html (dibangun dari Excel aslinya):
     * [[kunci]] diganti $text, [[kunci:i]] = kotak per karakter dari
     * $boxes (nama placeholder, boleh cadangan `a|b`; awalan `=` = teks
     * tetap). Token tanpa pasangan dicetak kosong.
     *
     * @param  array<string, string>  $text
     * @param  array<string, string>  $boxes
     */
    /**
     * NIK saksi lalu nama (dan No. KK): diisi otomatis dari data penduduk
     * bila NIK terdaftar di desa ini, selain itu diketik. Saksi bukan
     * pemohon, bukan saksi lainnya, dan bukan pihak di isian NIK $parties
     * (mis. suami/istri).
     *
     * @param  array<int, string>  $parties
     * @return array<int, array<string, mixed>>
     */
    private function witness(int $no, string $label, bool $withFamilyNumber = false, array $parties = []): array
    {
        return [
            // Warga desa yang punya akun diminta persetujuannya (LetterSignatureService).
            [
                ...$this->field("nik_saksi_{$no}", "NIK Saksi {$label}", 'nik', true, '16 digit NIK'),
                'witness' => "Saksi {$label}",
                'not_same_as' => ['nik_saksi_'.($no === 1 ? 2 : 1), ...$parties],
            ],
            [...$this->text("nama_saksi_{$no}", "Nama Saksi {$label}", true, 'Nama lengkap'), 'from_nik' => "nik_saksi_{$no}"],
            ...($withFamilyNumber ? [[
                ...$this->field("kk_saksi_{$no}", "No. KK Saksi {$label}", 'nik', false, '16 digit No. KK'),
                'from_nik' => "nik_saksi_{$no}",
                'from_nik_value' => 'family_number',
            ]] : []),
        ];
    }

    private function sheetForm(string $file, array $text, array $boxes = []): string
    {
        $html = (string) file_get_contents(database_path("seeders/templates/{$file}.html"));

        return (string) preg_replace_callback('/\[\[([a-z0-9_]+)(?::(\d+))?\]\]/', function (array $match) use ($text, $boxes): string {
            [$key, $index] = [$match[1], $match[2] ?? ''];

            if ($index === '') {
                return $text[$key] ?? '';
            }

            $source = $boxes[$key] ?? null;

            return match (true) {
                $source === null => '',
                str_starts_with($source, '=') => mb_substr(substr($source, 1), (int) $index, 1),
                default => "{{ {$source}[{$index}] }}",
            };
        }, $html);
    }

    /**
     * Tanda centang pilihan: X bila isian bernilai salah satu opsi.
     *
     * @param  array<string, string>  $map  kunci token => nilai isian
     * @return array<string, string>
     */
    private function ticks(string $prefix, string $field, array $map): array
    {
        $ticks = [];

        foreach ($map as $token => $value) {
            $ticks["{$prefix}_{$token}"] = "{{#if {$field}={$value}}}X{{/if}}";
        }

        return $ticks;
    }

    private function birthReportForm(): string
    {
        $person = fn (string $prefix, string $name, string $nik, ?string $familyNumber = null): array => array_filter([
            "{$prefix}_nama" => $name,
            "{$prefix}_nik" => $nik,
            "{$prefix}_kk" => $familyNumber,
            "{$prefix}_kwn" => '=INDONESIA',
        ]);
        $birth = fn (string $prefix, string $tgl, string $bln, string $thn): array => [
            "{$prefix}_tgl" => $tgl,
            "{$prefix}_bln" => $bln,
            "{$prefix}_thn" => $thn,
        ];

        return $this->sheetForm('f2_01_pelaporan_capil', [
            'province' => '{{ village_province }}',
            'regency' => '{{ village_regency }}',
            'district' => '{{ village_district }}',
            'village' => '{{ village_name_short }}',
            'jenis_kelahiran' => 'X',
            ...$this->ticks('anak_jk', 'jenis_kelamin_anak', ['l' => 'L', 'p' => 'P']),
            ...$this->ticks('anak_tempat', 'tempat_dilahirkan', array_combine(array_keys(self::BIRTH_PLACE_OPTIONS), array_keys(self::BIRTH_PLACE_OPTIONS))),
            ...$this->ticks('anak_jenis', 'jenis_kelahiran', array_combine(array_keys(self::BIRTH_TYPE_OPTIONS), array_keys(self::BIRTH_TYPE_OPTIONS))),
            ...$this->ticks('anak_penolong', 'penolong_kelahiran', array_combine(array_keys(self::BIRTH_HELPER_OPTIONS), array_keys(self::BIRTH_HELPER_OPTIONS))),
            'anak_ke' => '{{ kelahiran_ke }}',
            'anak_berat' => '{{ berat_bayi }}',
            'place_date' => '{{ village_regency }}, {{ issued_at }}',
            ...$this->capilSigners(),
        ], [
            ...$person('pelapor', 'applicant_name', 'applicant_nik', 'applicant_family_number'),
            // Subjek akta = anak; NIK terbit bersama KK baru.
            'subjek1_nama' => 'nama_anak',
            'subjek1_kk' => 'applicant_family_number',
            'subjek1_kwn' => '=INDONESIA',
            ...$person('saksi1', 'nama_saksi_1', 'nik_saksi_1', 'kk_saksi_1'),
            ...$person('saksi2', 'nama_saksi_2', 'nik_saksi_2', 'kk_saksi_2'),
            'ayah_nama' => 'ayah_nama|nama_ayah',
            'ayah_nik' => 'ayah_nik|nik_ayah',
            'ayah_tempat_lahir' => 'ayah_tempat_lahir|tempat_lahir_ayah',
            ...$birth('ayah_lahir', 'ayah_lahir_tgl|tanggal_lahir_ayah_tgl', 'ayah_lahir_bln|tanggal_lahir_ayah_bln', 'ayah_lahir_thn|tanggal_lahir_ayah_thn'),
            'ayah_kwn' => '=INDONESIA',
            'ibu_nama' => 'ibu_nama',
            'ibu_nik' => 'ibu_nik',
            'ibu_tempat_lahir' => 'ibu_tempat_lahir',
            ...$birth('ibu_lahir', 'ibu_lahir_tgl', 'ibu_lahir_bln', 'ibu_lahir_thn'),
            'ibu_kwn' => '=INDONESIA',
            'anak_nama' => 'nama_anak',
            'anak_tempat_lahir' => 'tempat_kelahiran',
            'anak_hari' => 'tanggal_lahir_anak_namahari',
            ...$birth('anak_lahir', 'tanggal_lahir_anak_tgl', 'tanggal_lahir_anak_bln', 'tanggal_lahir_anak_thn'),
            'anak_pukul' => 'pukul_lahir',
            'anak_panjang' => 'panjang_bayi',
        ]);
    }

    /**
     * Kotak pelapor (pemohon) dan dua saksi F-2.01, dipakai semua pelaporan.
     *
     * @return array<string, string>
     */
    private function capilWitnessBoxes(): array
    {
        $boxes = [
            'pelapor_nama' => 'applicant_name',
            'pelapor_nik' => 'applicant_nik',
            'pelapor_kk' => 'applicant_family_number',
            'pelapor_kwn' => '=INDONESIA',
        ];

        foreach ([1, 2] as $no) {
            $boxes += [
                "saksi{$no}_nama" => "nama_saksi_{$no}",
                "saksi{$no}_nik" => "nik_saksi_{$no}",
                "saksi{$no}_kk" => "kk_saksi_{$no}",
                "saksi{$no}_kwn" => '=INDONESIA',
            ];
        }

        return $boxes;
    }

    /**
     * Teks kepala dan tanda tangan F-2.01.
     *
     * @return array<string, string>
     */
    private function capilHeader(string $event): array
    {
        return [
            'province' => '{{ village_province }}',
            'regency' => '{{ village_regency }}',
            'district' => '{{ village_district }}',
            'village' => '{{ village_name_short }}',
            "jenis_{$event}" => 'X',
            'place_date' => '{{ village_regency }}, {{ issued_at }}',
            ...$this->capilSigners(),
        ];
    }

    /**
     * Penanda tangan F-2.01: pelapor (pemohon) dan Kepala Desa yang
     * mengetahui.
     *
     * @return array<string, string>
     */
    private function capilSigners(): array
    {
        return [
            'reporter_sign' => '{{ tanda_tangan_pemohon }}( {{ applicant_name }} )',
            'kades_sign' => '{{ tanda_tangan_kepala_desa }}( {{ pejabat_kepala_desa_nama }} )',
        ];
    }

    private function deathReportForm(): string
    {
        $keys = fn (array $options): array => array_combine(array_keys($options), array_keys($options));

        return $this->sheetForm('f2_01_pelaporan_capil', [
            ...$this->capilHeader('kematian'),
            ...$this->ticks('mati_sebab', 'sebab_kematian', $keys(self::DEATH_CAUSE_OPTIONS)),
            ...$this->ticks('mati_terang', 'yang_menerangkan', $keys(self::DEATH_WITNESS_OPTIONS)),
        ], [
            ...$this->capilWitnessBoxes(),
            // Subjek akta = almarhum; orang tua = orang tua almarhum.
            'subjek1_nama' => 'almarhum_nama',
            'subjek1_nik' => 'almarhum_nik',
            'subjek1_kk' => 'applicant_family_number',
            'subjek1_kwn' => '=INDONESIA',
            'ayah_nama' => 'almarhum_nama_ayah',
            'ibu_nama' => 'almarhum_nama_ibu',
            'mati_nik' => 'almarhum_nik',
            'mati_nama' => 'almarhum_nama',
            'mati_tanggal_tgl' => 'tanggal_kematian_tgl',
            'mati_tanggal_bln' => 'tanggal_kematian_bln',
            'mati_tanggal_thn' => 'tanggal_kematian_thn',
            'mati_pukul' => 'pukul_kematian',
            'mati_tempat' => 'tempat_kematian',
        ]);
    }

    /**
     * F-1.01 dari isian family_roster: susunan KK baru (maks. 10 anggota).
     */
    /**
     * @param  bool  $fromRoster  alamat & wilayah dari `<roster>_alamat/_dusun/_rt/_rw` (KK hasil F09), bukan dari pemohon
     */
    private function rosterBiodataForm(string $roster, bool $fromRoster = false): string
    {
        $cell = fn (int $row, string $key): string => $this->blank("{$roster}_{$row}_{$key}");
        $members = [];

        foreach (range(1, 10) as $row) {
            $members[] = [
                'name' => $cell($row, 'nama'),
                'gender' => $cell($row, 'jenis_kelamin'),
                'birth_place' => $cell($row, 'tempat_lahir'),
                'birth_date' => $cell($row, 'tanggal_lahir'),
                'nationality' => "{{#if {$roster}_{$row}_nama}}INDONESIA{{/if}}",
                'religion' => $cell($row, 'agama'),
                'marital_status' => $cell($row, 'status_kawin'),
                'family_role' => $cell($row, 'shdk'),
                'education' => $cell($row, 'pendidikan'),
                'occupation' => $cell($row, 'pekerjaan'),
                'mother_name' => $cell($row, 'nama_ibu'),
                'father_name' => $cell($row, 'nama_ayah'),
            ];
        }

        return $this->biodataForm(
            [
                'head' => $cell(1, 'nama'),
                'head_sign' => "{{ tanda_tangan_pemohon_bila_{$roster}_1_nik }}".$cell(1, 'nama'),
                'address' => $fromRoster ? "{{ {$roster}_alamat }}" : '{{ applicant_address }}',
                'hamlet' => $fromRoster ? "{{ {$roster}_dusun }}" : $cell(1, 'dusun'),
                'count' => "{{ {$roster}_jumlah }}",
            ],
            [
                'postal' => 'village_postal_code',
                'rt' => $fromRoster ? "{$roster}_rt" : "{$roster}_1_rt",
                'rw' => $fromRoster ? "{$roster}_rw" : "{$roster}_1_rw",
            ],
            $members,
        );
    }

    private function birthStatementForm(): string
    {
        return $this->sheetForm('f2_03_sptjm_kelahiran', [
            'ibu_nama' => '{{ ibu_nama }}',
            'ibu_nik' => '{{ ibu_nik }}',
            'ibu_ttl' => '{{ ibu_tempat_lahir }}, {{ ibu_tanggal_lahir }}',
            'ibu_pekerjaan' => '{{ ibu_pekerjaan }}',
            'ibu_alamat' => '{{ ibu_alamat }}',
            'anak_nama' => '{{ nama_anak }}',
            'anak_ttl' => '{{ tempat_kelahiran }}, {{ tanggal_lahir_anak }}',
            'anak_ke' => '{{ kelahiran_ke }}',
            'anak_jenis' => '{{ jenis_kelahiran }}',
            'penolong_nama' => '{{ nama_penolong }}',
            'penolong_nik' => $this->blank('nik_penolong'),
            'penolong_pekerjaan' => '{{ pekerjaan_penolong }}',
            'penolong_alamat' => '{{ alamat_penolong }}',
            'place_date' => '{{ village_regency }}, {{ issued_at }}',
            'ibu_sign' => '{{ tanda_tangan_pemohon_bila_ibu_nik }}{{ ibu_nama }}',
            'saksi1_nama' => '{{ nama_saksi_1 }}',
            'saksi1_nik' => '{{ nik_saksi_1 }}',
            'saksi2_nama' => '{{ nama_saksi_2 }}',
            'saksi2_nik' => '{{ nik_saksi_2 }}',
        ]);
    }

    /**
     * F-2.10. $child: isian data anak; bawaannya anak yang baru lahir (F05),
     * yang NIK dan aktanya belum ada sehingga dicetak bertitik.
     * $fatherFromFamily: ayah boleh dipilih dari KK pemohon (F05); bila tidak,
     * data ayah diketik/dari NIK (F08).
     *
     * @param  array<string, string>  $child
     */
    private function acknowledgementForm(array $child = [], bool $fatherFromFamily = true): string
    {
        $dots = str_repeat('…', 22);
        $child = [
            'anak_nama' => '{{ nama_anak }}',
            'anak_nik' => $dots,
            'anak_jk' => '{{ jenis_kelamin_anak }}',
            'anak_ttl' => '{{ tempat_kelahiran }}, {{ tanggal_lahir_anak }}',
            'anak_akta' => $dots,
            'anak_akta_tgl' => $dots,
            'anak_akta_dinas' => $dots,
            'anak_akta_alamat' => $dots,
            ...$child,
        ];

        // Ayah: dari KK pemohon (isian family_member `ayah`, F05) atau diketik.
        $father = $fatherFromFamily
            ? ['nama' => 'ayah_nama|nama_ayah', 'nik' => 'ayah_nik|nik_ayah', 'tempat_lahir' => 'ayah_tempat_lahir|tempat_lahir_ayah',
                'tanggal_lahir' => 'ayah_tanggal_lahir|tanggal_lahir_ayah', 'pekerjaan' => 'ayah_pekerjaan|pekerjaan_ayah', 'alamat' => 'ayah_alamat|alamat_ayah']
            : ['nama' => 'nama_ayah', 'nik' => 'nik_ayah', 'tempat_lahir' => 'tempat_lahir_ayah',
                'tanggal_lahir' => 'tanggal_lahir_ayah', 'pekerjaan' => 'pekerjaan_ayah', 'alamat' => 'alamat_ayah'];
        // F08: ayah yang mengajukan sendiri memakai data akunnya.
        $own = fn (string $applicant, string $typed): string => $fatherFromFamily
            ? $typed
            : "{{#if pemohon_ayah=ya}}{{ {$applicant} }}{{/if}}{{#if pemohon_ayah=tidak}}{$typed}{{/if}}";

        return $this->sheetForm('f2_10_pengakuan_anak', [
            ...$child,
            'ayah_nama' => "{{ {$father['nama']} }}",
            'ayah_nik' => "{{ {$father['nik']} }}",
            'ayah_ttl' => $own('applicant_birth_place_date', "{{ {$father['tempat_lahir']} }}, {{ {$father['tanggal_lahir']} }}"),
            'ayah_pekerjaan' => $own('applicant_occupation', "{{ {$father['pekerjaan']} }}"),
            'ayah_alamat' => $own('applicant_address', "{{ {$father['alamat']} }}"),
            'ibu_nama' => '{{ ibu_nama }}',
            'ibu_nik' => '{{ ibu_nik }}',
            'ibu_ttl' => '{{ ibu_tempat_lahir }}, {{ ibu_tanggal_lahir }}',
            'ibu_pekerjaan' => '{{ ibu_pekerjaan }}',
            'ibu_alamat' => '{{ ibu_alamat }}',
            'place_date' => '{{ village_regency }}, {{ issued_at }}',
            'ibu_sign' => '{{ tanda_tangan_pemohon_bila_ibu_nik }}{{ ibu_nama }}',
            'ayah_sign' => ($fatherFromFamily ? '{{ tanda_tangan_pemohon_bila_ayah_nik }}' : '')."{{ tanda_tangan_pemohon_bila_nik_ayah }}{{ {$father['nama']} }}",
        ]);
    }

    // ------------------------------------------------------------------
    // F-1.01 Biodata Keluarga (dipakai layanan yang membuat/menyusun KK)
    // ------------------------------------------------------------------

    /**
     * Formulir F-1.01 (mendatar), tata letaknya sama dengan Excel aslinya
     * (templates/f1_01_biodata_keluarga.html). Kolom khusus orang asing dan
     * WNI di luar negeri dicetak kosong; kode wilayah diisi petugas.
     *
     * @param  array<string, string>  $family  head, address, hamlet, count (+ email, head_sign)
     * @param  array<string, string>  $boxes  isian kotak per karakter: postal, rt, rw, phone => nama placeholder
     * @param  array<int, array<string, string>>  $members  baris anggota (maks. 10)
     */
    private function biodataForm(array $family, array $boxes, array $members): string
    {
        $family = [
            'province' => '{{ village_province }}',
            'regency' => '{{ village_regency }}',
            'district' => '{{ village_district }}',
            'village' => '{{ village_name_short }}',
            ...$family,
        ];
        // Nama kepala keluarga di kolom tanda tangan (+TTD bila diberikan).
        $family['head_sign'] ??= $family['head'];
        $html = (string) file_get_contents(database_path('seeders/templates/f1_01_biodata_keluarga.html'));

        return (string) preg_replace_callback('/\[\[([a-z0-9_]+)(?:\.([a-z_]+))?(?::(\d+))?\]\]/', function (array $match) use ($family, $boxes, $members): string {
            [, $key, $column, $index] = $match + [2 => '', 3 => ''];

            // Baris anggota: [[m1.name]] dst.
            if ($column !== '') {
                return $members[(int) substr($key, 1) - 1][$column] ?? '';
            }

            if ($index === '') {
                return $family[$key] ?? '';
            }

            // Jumlah anggota rata kanan di dua kotak.
            if ($key === 'count') {
                $count = $family['count'] ?? '';

                if (str_starts_with($count, '{{')) {
                    return $index === '1' ? $count : '';
                }

                return trim(str_pad($count, 2, ' ', STR_PAD_LEFT)[(int) $index]);
            }

            return isset($boxes[$key]) ? "{{ {$boxes[$key]}[{$index}] }}" : '';
        }, $html);
    }

    // ------------------------------------------------------------------
    // F-1.02 Pendaftaran Peristiwa Kependudukan (dipakai banyak layanan)
    // ------------------------------------------------------------------

    /**
     * Kotak centang cetak: true = tercentang, string = tercentang bila
     * syarat {{#if ...}} terpenuhi, selain itu kosong.
     */
    private function checkbox(bool|string|null $mark): string
    {
        $tick = match (true) {
            $mark === true => 'X',
            is_string($mark) => "{{#if {$mark}}}X{{/if}}",
            default => '',
        };

        return '<span style="display: inline-block; width: 11px; height: 11px; border: 1px solid #000; font-size: 8pt; line-height: 11px; text-align: center; vertical-align: middle; margin-right: 4px;">'.$tick.'</span>';
    }

    /**
     * Formulir F-1.02 (tata letak dari Excel aslinya, templates/
     * f1_02_pendaftaran.html). $marks: kunci pilihan => true / syarat
     * {{#if}}; pilihan terpilih ditandai "V" (jenis permohonan di belakang
     * labelnya, persyaratan di dalam lingkarannya), seperti di Excel.
     * $applicant: data pemohon bila bukan pemohon akun (mis. pendatang yang
     * diajukan perantara): name, nik, family_number.
     *
     * @param  array<string, bool|string>  $marks
     * @param  array<string, string>  $applicant
     */
    private function registrationForm(array $marks, array $applicant = []): string
    {
        ['name' => $name, 'nik' => $nik, 'family_number' => $familyNumber] = [
            'name' => '{{ applicant_name }}',
            'nik' => '{{ applicant_nik }}',
            'family_number' => '{{ applicant_family_number }}',
            ...$applicant,
        ];

        $html = $this->sheetForm('f1_02_pendaftaran', [
            'name' => $name,
            'nik' => $nik,
            'family_number' => $familyNumber,
            'place_date' => '{{ village_name_short }}, {{ issued_at }}',
            'officer' => '{{ tanda_tangan_kasi_pemerintahan }}{{ village_kasi_pemerintahan_name }}',
            'applicant' => ($applicant === [] ? '{{ tanda_tangan_pemohon }}' : '').$name,
        ]);

        // [[mark:..]] = "V" di belakang label jenis permohonan; [[tick:..]] =
        // "V" di dalam lingkaran persyaratan.
        return (string) preg_replace_callback('/\[\[(mark|tick):([a-z_.]+)\]\]/', function (array $match) use ($marks): string {
            $mark = $marks[$match[2]] ?? null;
            $tick = $match[1] === 'mark' ? ' <b>V</b>' : 'V';

            return match (true) {
                $mark === true => $tick,
                is_string($mark) => "{{#if {$mark}}}{$tick}{{/if}}",
                default => '',
            };
        }, $html);
    }

    /**
     * Tanda tangan tanpa materai: tempat-tanggal, keterangan, nama.
     */
    private function plainSignature(string $placeDate, string $caption, string $name, string $signature = ''): string
    {
        return <<<HTML
        <table style="width: 100%; margin-top: 18px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p style="margin: 0;">{$placeDate}</p>
                    <p style="margin: 2px 0 0 0;">{$caption}</p>
                    <div style="height: 60px;"></div>
                    {$signature}<p style="margin: 0; font-weight: bold;">( {$name} )</p>
                </td>
            </tr>
        </table>
        HTML;
    }
}
