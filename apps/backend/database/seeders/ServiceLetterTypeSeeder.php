<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AssignedRole;
use App\Enums\LetterDataAction;
use App\Enums\LetterTypeCategory;
use App\Models\ApprovalFlow;
use App\Models\LetterType;
use App\Models\Village;
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
}
