<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AssignedRole;
use App\Enums\LetterDataAction;
use App\Enums\LetterTypeCategory;
use App\Models\ApprovalFlow;
use App\Models\LetterType;
use App\Models\Village;
use App\Support\CitizenLabels;
use Database\Seeders\Concerns\DefinesLetterTypes;
use Illuminate\Database\Seeder;

/**
 * Jenis surat Pelayanan Desa (Fxx): formulir pelayanan kependudukan
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
                    $this->text('alamat', 'Alamat (Dusun/Jalan)', true, 'Contoh: Dusun Budiasih'),
                    $this->text('rt', 'RT', true, 'Contoh: 002'),
                    $this->text('rw', 'RW', true, 'Contoh: 019'),
                ],
                'result_upload_hint' => 'Dokumen kependudukan yang terbit dari Disdukcapil (KK dan/atau KTP-el/KIA).',
                // Setelah dokumen terbit, Kasi Pemerintahan mendaftarkan orang
                // ini di Data Penduduk lalu menandai selesai.
                'data_action' => LetterDataAction::Manual->value,
                'data_instructions' => 'Daftarkan orang ini sebagai warga di Data Penduduk dan masukkan ke KK-nya sesuai dokumen kependudukan yang terbit dari Disdukcapil, lalu tandai selesai.',
                'template' => $this->form('F-1.04', 'SURAT PERNYATAAN TIDAK MEMILIKI DOKUMEN KEPENDUDUKAN', [
                    $this->rowsBlock('Yang bertanda tangan di bawah ini :', [
                        'Nama Lengkap' => '{{ nama_lengkap }}',
                        'Tempat dan Tanggal Lahir' => '{{ tempat_lahir }}, {{ tanggal_lahir }}',
                        'Jenis Kelamin' => '{{ jenis_kelamin }}',
                        'Nama Ibu' => '{{ nama_ibu }}',
                        'Golongan Darah' => '{{ golongan_darah }}',
                        'Pendidikan Terakhir' => '{{ pendidikan_terakhir }}',
                        'Alamat' => '{{ alamat }} RT {{ rt }} RW {{ rw }}',
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
                        $this->date('sptjm_tanggal', 'Tanggal Perkawinan/Perceraian'),
                        $this->text('nama_suami', 'Nama Suami', true, 'Nama lengkap'),
                        $this->field('nik_suami', 'NIK Suami', 'nik', true, '16 digit NIK'),
                        $this->text('nama_istri', 'Nama Istri', true, 'Nama lengkap'),
                        $this->field('nik_istri', 'NIK Istri', 'nik', true, '16 digit NIK'),
                        $this->text('nama_saksi_1', 'Nama Saksi I', true, 'Nama lengkap'),
                        $this->field('nik_saksi_1', 'NIK Saksi I', 'nik', true, '16 digit NIK'),
                        $this->text('nama_saksi_2', 'Nama Saksi II', true, 'Nama lengkap'),
                        $this->field('nik_saksi_2', 'NIK Saksi II', 'nik', true, '16 digit NIK'),
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
                        $this->text('alamat_wna', 'Alamat di Desa Ini (Dusun/Jalan)', true, 'Contoh: Dusun Sinargalih'),
                        $this->text('rt_wna', 'RT', true, 'Contoh: 001'),
                        $this->text('rw_wna', 'RW', true, 'Contoh: 006'),
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
                'data_instructions' => 'Anggota KK yang pindah dinonaktifkan beserta akunnya. Bila kepala keluarga ikut pindah sementara anggota lain tetap tinggal, atur kepala keluarga baru di Data KK sesuai KK terbaru dari Disdukcapil. Untuk orang asing (SKTT), tidak ada data warga yang diubah; cukup tandai selesai.',
                'template' => $this->moveOutForm(),
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
        $changeHead = fn (string $left, string $right): string => '<tr>'
            .$this->headCell('No', 'rowspan="2"')
            .$this->headCell('Nama', 'rowspan="2"')
            .$this->headCell($left, 'colspan="3"')
            .$this->headCell($right, 'colspan="3"')
            .'</tr><tr>'
            .$this->headCell('Semula').$this->headCell('Menjadi').$this->headCell('Dasar Perubahan')
            .$this->headCell('Semula').$this->headCell('Menjadi').$this->headCell('Dasar Perubahan')
            .'</tr>';
        $changeRow = fn (string $first, string $second): string => '{{#each perubahan}}<tr>'
            .$this->cell('{{ no }}', 'text-align: center;')
            .$this->cell('{{ anggota_nama }}')
            .$first.$second
            .'</tr>{{/each}}';

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
            $this->gridTable(
                $changeHead('Pendidikan Terakhir', 'Pekerjaan'),
                $changeRow(
                    $this->changeCells('pendidikan_menjadi', 'anggota_pendidikan', 'dasar_pendidikan'),
                    $this->changeCells('pekerjaan_menjadi', 'anggota_pekerjaan', 'dasar_pekerjaan'),
                ),
            ),
            '<p style="margin: 8px 0 0; font-weight: bold;">B. Agama dan Perubahan Lainnya:</p>',
            $this->gridTable(
                $changeHead('Agama', 'Lainnya, yaitu: Status Perkawinan'),
                $changeRow(
                    $this->changeCells('agama_menjadi', 'anggota_agama', 'dasar_agama'),
                    $this->changeCells('status_kawin_menjadi', 'anggota_status_kawin', 'dasar_status_kawin'),
                ),
            ),
            $this->paragraph('Terlampir disampaikan fotokopi berkas-berkas yang terkait dengan perubahan elemen data tersebut.', false),
            $this->paragraph('Demikian Surat Pernyataan ini saya buat dengan sebenarnya, apabila dalam keterangan yang saya berikan terdapat hal-hal yang tidak berdasarkan keadaan yang sebenarnya, saya bersedia dikenakan sanksi sesuai ketentuan peraturan perundang-undangan yang berlaku.', false),
            $this->plainSignature('{{ village_name_short }}, {{ issued_at }}', 'Yang membuat pernyataan,', '{{ applicant_name }}'),
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

    private function unrecordedMarriageStatement(): string
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
            $this->paragraph('menyatakan bahwa kami telah melakukan {{#if sptjm_peristiwa=perkawinan}}perkawinan sebagai suami istri{{/if}}{{#if sptjm_peristiwa=perceraian}}perceraian{{/if}}, yang dilaksanakan pada {{ sptjm_tanggal }}, dengan saksi-saksi&nbsp;:', false),
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
                    <td style="width: 50%; vertical-align: top;">PIHAK KEDUA,<div style="height: 60px;"></div>( {{ nama_istri }} )</td>
                    <td style="width: 50%; vertical-align: top;">PIHAK PERTAMA,
                        <div style="width: 90px; height: 50px; margin: 5px auto; border: 1px dashed #777; font-size: 8pt; color: #555; display: table;"><span style="display: table-cell; vertical-align: middle;">Materai<br>Cukup</span></div>
                        ( {{ nama_suami }} )</td>
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
        return "{{#if kewarganegaraan=wni}}{$citizen}{{/if}}{{#if kewarganegaraan=wna}}".$this->blank($foreigner).'{{/if}}';
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
                .$row('5.', 'Alamat Jelas', $this->mover('{{ applicant_address }}', 'alamat_wna')
                    .'{{#if kewarganegaraan=wna}} RT '.$this->blank('rt_wna').' RW '.$this->blank('rw_wna').'{{/if}}'
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
            .'<td style="width: 50%; vertical-align: top;">{{ village_name_short }}, {{ issued_at }}<br>Pemohon,<br>&nbsp;<div style="height: 60px;"></div>( '.$this->mover('{{ applicant_name }}', 'nama_wna').' )</td>'
            .'</tr></table>',
        ]);
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
     * Formulir F-1.02. $marks: kunci pilihan => true / syarat {{#if}}.
     *
     * @param  array<string, bool|string>  $marks
     */
    private function registrationForm(array $marks): string
    {
        $item = fn (string $key, string $label, int $indent = 0): string => '<div style="padding-left: '.$indent.'px; margin: 1px 0;">'
            .$this->checkbox($marks[$key] ?? null).$label.'</div>';
        $group = fn (string $title, string $items): string => '<div style="margin: 4px 0 2px; font-weight: bold;">'.$title.'</div>'.$items;

        $kk = $group('I. KARTU KELUARGA', $group('A. BARU', $item('kk.baru.keluarga_baru', '1. Membentuk Keluarga Baru', 8)
            .$item('kk.baru.ganti_kepala', '2. Penggantian Kepala Keluarga', 8)
            .$item('kk.baru.pisah', '3. Pisah KK', 8)
            .$item('kk.baru.pindah_datang', '4. Pindah Datang', 8)
            .$item('kk.baru.wni_ln', '5. WNI dari LN karena Pindah', 8)
            .$item('kk.baru.rentan', '6. Rentan Adminduk', 8))
            .$group('B. PERUBAHAN DATA', $item('kk.ubah.menumpang', '1. Menumpang dalam KK', 8)
            .$item('kk.ubah.peristiwa', '2. Peristiwa Penting', 8)
            .$item('kk.ubah.elemen', '3. Perubahan elemen data yang tercantum dalam KK', 8))
            .$group('C. HILANG/ RUSAK', $item('kk.hilang', '1. Hilang', 8).$item('kk.rusak', '2. Rusak', 8)));

        $ktp = $group('II. KTP-El', $item('ktp.baru', 'A. BARU')
            .$item('ktp.pindah_datang', 'B. PINDAH DATANG')
            .$group('C. HILANG/ RUSAK', $item('ktp.hilang', '1. Hilang', 8).$item('ktp.rusak', '2. Rusak', 8))
            .$item('ktp.itap', 'D. PERPANJANGAN ITAP')
            .$item('ktp.kewarganegaraan', 'E. PERUBAHAN STATUS KEWARGANEGARAAN')
            .$item('ktp.luar_domisili', 'F. LUAR DOMISILI')
            .$item('ktp.transmigrasi', 'G. TRANSMIGRASI'));

        $kia = $group('III. KARTU IDENTITAS ANAK / KIA', $item('kia.baru', 'A. BARU')
            .$group('B. HILANG/ RUSAK', $item('kia.hilang', '1. Hilang', 8).$item('kia.rusak', '2. Rusak', 8))
            .$item('kia.itap', 'C. Perpanjangan ITAP')
            .$item('kia.lainnya', 'D. Lainnya'));

        $change = $group('IV. PERUBAHAN DATA', $item('ubah.kk', 'A. KK').$item('ubah.ktp', 'B. KTP-El').$item('ubah.kia', 'C. KIA')
            .'<div style="margin-top: 4px;">Melampirkan :<br>1) Formulir Perubahan Data; dan<br>2) Bukti Perubahan Data</div>');

        $attachments = [
            ['lampiran.kk_lama', 'KK Lama/ KK Rusak'], ['lampiran.bukti', 'Surat Keterangan/ Bukti Perubahan Peristiwa Kependudukan dan Peristiwa Penting'],
            ['lampiran.buku_nikah', 'Buku Nikah/ Kutipan Akta Perkawinan'], ['lampiran.sptjm', 'SPTJM perkawinan/ perceraian belum tercatat'],
            ['lampiran.akta_cerai', 'Kutipan Akta Perceraian'], ['lampiran.akta_kematian', 'Akta Kematian'],
            ['lampiran.skp', 'Surat Keterangan Pindah'], ['lampiran.pernyataan_hilang', 'Surat Pernyataan penyebab terjadinya hilang atau rusak'],
            ['lampiran.skpln', 'Surat Keterangan Pindah Luar Negeri'], ['lampiran.skp_perwakilan', 'Surat Keterangan Pindah dari Perwakilan RI'],
            ['lampiran.ktp_rusak', 'KTP-El Rusak'], ['lampiran.bersedia_menerima', 'Surat Pernyataan bersedia menerima sebagai anggota keluarga'],
            ['lampiran.dokumen_perjalanan', 'Dokumen Perjalanan'], ['lampiran.kuasa_asuh', 'Surat kuasa pengasuhan anak dari orang tua/ wali'],
            ['lampiran.hilang_polisi', 'Surat Keterangan Hilang dari Kepolisian'], ['lampiran.itap', 'Kartu Izin Tinggal Tetap'],
        ];
        $attachmentRows = '';

        foreach (array_chunk($attachments, 2) as [$left, $right]) {
            $attachmentRows .= '<tr><td style="width: 50%; vertical-align: top; padding: 1px 0;">'.$item(...$left).'</td>'
                .'<td style="width: 50%; vertical-align: top; padding: 1px 0;">'.$item(...$right).'</td></tr>';
        }

        $column = fn (string $html): string => '<td style="width: 25%; vertical-align: top; padding: 0 4px;">'.$html.'</td>';

        return $this->form('F-1.02', 'FORMULIR PENDAFTARAN PERISTIWA KEPENDUDUKAN', [
            '<p style="margin: 0; font-weight: bold;">I. DATA PEMOHON</p>',
            $this->rowsBlock(null, [
                '1. Nama Lengkap' => '{{ applicant_name }}',
                '2. Nomor Induk Kependudukan' => '{{ applicant_nik }}',
                '3. Nomor Kartu Keluarga' => '{{ applicant_family_number }}',
            ], 0),
            '<p style="margin: 8px 0 4px; font-weight: bold;">II. JENIS PERMOHONAN</p>',
            '<table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;"><tr>'.$column($kk).$column($ktp).$column($kia).$column($change).'</tr></table>',
            '<p style="margin: 10px 0 4px; font-weight: bold;">III. PERSYARATAN YANG DILAMPIRKAN</p>',
            '<table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">'.$attachmentRows.'</table>',
            <<<'HTML'
            <table style="width: 100%; margin-top: 18px; border-collapse: collapse; text-align: center;">
                <tr>
                    <td style="width: 50%;"></td>
                    <td style="width: 50%;">{{ village_name_short }}, {{ issued_at }}</td>
                </tr>
                <tr>
                    <td style="vertical-align: top;">Petugas<br>Kasi Pemerintahan<div style="height: 60px;"></div>( {{ village_kasi_pemerintahan_name }} )</td>
                    <td style="vertical-align: top;">Pemohon,<br>&nbsp;<div style="height: 60px;"></div>( {{ applicant_name }} )</td>
                </tr>
            </table>
            HTML,
        ]);
    }

    /**
     * Tanda tangan tanpa materai: tempat-tanggal, keterangan, nama.
     */
    private function plainSignature(string $placeDate, string $caption, string $name): string
    {
        return <<<HTML
        <table style="width: 100%; margin-top: 18px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p style="margin: 0;">{$placeDate}</p>
                    <p style="margin: 2px 0 0 0;">{$caption}</p>
                    <div style="height: 60px;"></div>
                    <p style="margin: 0; font-weight: bold;">( {$name} )</p>
                </td>
            </tr>
        </table>
        HTML;
    }
}
