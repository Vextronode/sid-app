<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\LetterType;
use Illuminate\Database\Seeder;

class LetterTypeSeeder extends Seeder
{
    /**
     *
     *   A  - Approval Normal, 4 tahap (No. 1-11, 14)
     *   AC - Approval Normal + Dokumen Pendukung khusus (No. 13)
     *   C  - Dokumen Pendukung, tetap pengajuan surat sendiri (No. 15-16)
     *   B  - Upload Mandiri / TTD eksternal (No. 17-25)
     *   D  - Update Data Kependudukan, bukan terbit surat (No. 26-30)
     *
     * All rows: is_active=true + template!=NULL (status Aktif, lolos gate UC-03).
     */
    public function run(): void
    {
        foreach ($this->letterTypes() as $type) {
            $body = $type['body'];
            unset($type['body']);

            LetterType::updateOrCreate(
                ['code' => $type['code']],
                array_merge($type, [
                    'template' => $this->baseTemplate($type['code'], $type['name'], $body),
                    'is_active' => true,
                ])
            );
        }
    }

    private function baseTemplate(string $code, string $title, string $body): string
    {
        $kop = <<<HTML
        <div style="text-align: center; margin-bottom: 5px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 15%; text-align: center; vertical-align: middle;"></td>
                    <td style="width: 70%; text-align: center; vertical-align: middle;">
                        <div style="font-size: 12pt; font-weight: bold;">PEMERINTAH KABUPATEN PANGANDARAN</div>
                        <div style="font-size: 12pt; font-weight: bold;">KECAMATAN PARIGI</div>
                        <div style="font-size: 14pt; font-weight: bold;">DESA CIBENDA</div>
                        <div style="font-size: 9.5pt; margin-top: 2px;">Jl.Raya Cijulang Nomor.173.Tlp.0265.2640613</div>
                        <div style="font-size: 9.5pt; font-style: italic; color: #0000ff; text-decoration: underline;">email : kantordesacibenda@gmail.com</div>
                    </td>
                    <td style="width: 15%; text-align: right; vertical-align: bottom; font-size: 9.5pt;">
                        Kode Pos 46393
                    </td>
                </tr>
            </table>
            <div style="border-top: 3px solid #000; border-bottom: 1px solid #000; height: 2px; margin-top: 4px; margin-bottom: 15px;"></div>
        </div>
        HTML;

        $ttdPetugas = <<<HTML
        <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 8px 0;">Yang bertanda tangan dibawah ini :</p>
            <table style="width: 100%; border-collapse: collapse; margin-left: 30px;">
                <tr>
                    <td style="width: 170px; vertical-align: top; padding: 2px 0;">Nama</td>
                    <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding: 2px 0;">Jabatan</td>
                    <td style="vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                </tr>
            </table>
        </div>
        HTML;

        $pemohon = <<<HTML
        <div style="margin-bottom: 15px;">
            <p style="margin: 0 0 8px 0;">Menerangkan dengan sebenarnya bahwa :</p>
            <table style="width: 100%; border-collapse: collapse; margin-left: 30px;">
                <tr>
                    <td style="width: 170px; vertical-align: top; padding: 2px 0;">Nama</td>
                    <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">{{ applicant_name }}</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding: 2px 0;">Tempat Tanggal Lahir</td>
                    <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">{{ applicant_birth_place_date }}</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding: 2px 0;">NIK</td>
                    <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">{{ applicant_nik }}</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding: 2px 0;">Jenis Kelamin</td>
                    <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">{{ applicant_gender }}</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding: 2px 0;">Alamat</td>
                    <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">{{ applicant_address }}</td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                </tr>
            </table>
        </div>
        HTML;

        $signature = <<<HTML
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p style="margin: 0;">{{ village_name }}, {{ submitted_at }}</p>
                    <p style="margin: 2px 0 0 0;">Kepala Desa {{ village_name }}</p>
                    <div style="height: 50px; margin: 4px 0; vertical-align: middle;">{{ signature_img }}</div>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">{{ village_head_name }}</p>
                </td>
            </tr>
        </table>
        HTML;

        if ($code === 'A01') {
            return <<<HTML
            <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
                {$kop}
                <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                    <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN USAHA</div>
                    <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
                </div>
                {$ttdPetugas}
                {$pemohon}
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Orang tersebut diatas benar-benar warga kami dan perlu kami terangkan bahwa orang tersebut diatas benar-benar mempunyai kegiatan usaha &ldquo; ________________________ &rdquo; di wilayah Desa Cibenda Kecamatan Parigi Kabupaten Pangandaran Jawa Barat.
                </p>
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.
                </p>
                {$signature}
            </div>
            HTML;
        }

        if ($code === 'A02') {
            return <<<HTML
            <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
                {$kop}
                <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                    <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN TIDAK MEMILIKI RUMAH</div>
                    <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
                </div>
                {$ttdPetugas}
                {$pemohon}
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Orang tersebut diatas benar-benar warga masyarakat Desa kami, dan menurut keterangan yang bersangkutan bahwa orang tersebut benar-benar <strong>tidak memiliki rumah</strong>.
                </p>
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.
                </p>
                {$signature}
            </div>
            HTML;
        }

        if ($code === 'A04') {
            return <<<HTML
            <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
                {$kop}
                <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                    <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN DOMISILI</div>
                    <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
                </div>
                {$ttdPetugas}
                {$pemohon}
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Orang tersebut diatas bukan warga masyarakat Desa kami, namun menurut keterangan RT/RW dan Kepala Dusun setempat yang bersangkutan saat ini tinggal dan berdomisili di alamat Dusun Cibenda Rt 001/Rw 013 Desa Cibenda Kecamatan Parigi Kabupaten Pangandaran Jawa Barat.
                </p>
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.
                </p>
                {$signature}
            </div>
            HTML;
        }

        if ($code === 'A05') {
            $pemohonPendek = <<<HTML
            <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 6px 0;">Menerangkan dengan sebenarnya bahwa :</p>
                <table style="width: 100%; border-collapse: collapse; margin-left: 30px;">
                    <tr>
                        <td style="width: 170px; vertical-align: top; padding: 2px 0;">Nama</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ applicant_name }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Tempat Tanggal Lahir</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ applicant_birth_place_date }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">NIK</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ applicant_nik }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Jenis Kelamin</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ applicant_gender }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Alamat</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ applicant_address }}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td></td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                </table>
            </div>
            HTML;

            $anak = <<<HTML
            <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 6px 0; text-decoration: underline;">Selaku Orangtua dari :</p>
                <table style="width: 100%; border-collapse: collapse; margin-left: 30px;">
                    <tr>
                        <td style="width: 170px; vertical-align: top; padding: 2px 0;">Nama</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Tempat Tanggal Lahir</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">NIK</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Jenis Kelamin</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Alamat</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td></td>
                        <td style="vertical-align: top; padding: 2px 0;">________________________________________</td>
                    </tr>
                </table>
            </div>
            HTML;

            return <<<HTML
            <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
                {$kop}
                <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                    <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN TIDAK MAMPU</div>
                    <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
                </div>
                {$ttdPetugas}
                {$pemohonPendek}
                {$anak}
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Orang tersebut benar-benar warga masyarakat Desa kami, yang Tinggal dan berdomisili di alamat tersebut diatas menurut keterangan RT/ RW dan warga setempat bahwa orang tersebut benar-benar <strong>tidak mampu</strong>.
                </p>
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya untuk Melengkapi Persyaratan dan syarat ____________________________, Mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.
                </p>
                {$signature}
            </div>
            HTML;
        }

        if ($code === 'A09') {
            return <<<HTML
            <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
                {$kop}
                <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                    <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN BELUM MENIKAH</div>
                    <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
                </div>
                {$ttdPetugas}
                {$pemohon}
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Orang tersebut diatas warga masyarakat Desa kami, namun menurut keterangan yang bersangkutan bahwa orang tersebut diatas benar-benar <strong>belum menikah</strong>.
                </p>
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.
                </p>
                {$signature}
            </div>
            HTML;
        }

        return <<<HTML
        <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #000;">
            {$kop}
            <div style="text-align: center; margin-top: 15px; margin-bottom: 20px;">
                <div style="font-size: 12pt; font-weight: bold; text-decoration: underline;">{$title}</div>
                <div style="font-size: 11pt; margin-top: 3px;">Nomor : {{ letter_number }}</div>
            </div>
            {$ttdPetugas}
            {$pemohon}
            <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                {$body}
            </p>
            <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                Demikian surat ini dibuat agar dapat dipergunakan sebagaimana mestinya.
            </p>
            {$signature}
        </div>
        HTML;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function letterTypes(): array
    {
        return [
            // ── Kategori A: Approval Normal, 4 tahap (No. 1-11, 14) ─────────
            [
                'code' => 'A01',
                'name' => 'Surat Keterangan Usaha',
                'description' => 'Keterangan kepemilikan/menjalankan usaha di wilayah desa.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, jenis & lokasi usaha.',
                'assigned_role' => 'rw',
                'validity_days' => 365,
                'body' => 'adalah benar memiliki/menjalankan usaha berupa {{ jenis_usaha }} yang berlokasi di {{ lokasi_usaha }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A02',
                'name' => 'Surat Keterangan Tidak Memiliki Rumah',
                'description' => 'Keterangan belum/tidak memiliki rumah atau tempat tinggal tetap.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK.',
                'assigned_role' => 'rw',
                'validity_days' => 180,
                'body' => 'berdasarkan data yang ada, benar tidak/belum memiliki rumah atau tempat tinggal tetap, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A03',
                'name' => 'Surat Keterangan Penghasilan',
                'description' => 'Keterangan penghasilan/mata pencaharian untuk keperluan administratif.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, jenis usaha/mata pencaharian, jumlah penghasilan per bulan.',
                'assigned_role' => 'rw',
                'validity_days' => 90,
                'body' => 'memiliki mata pencaharian sebagai {{ jenis_usaha_mata_pencaharian }} dengan penghasilan kurang lebih Rp {{ penghasilan_per_bulan }} per bulan, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A04',
                'name' => 'Surat Keterangan Domisili',
                'description' => 'Keterangan domisili/tempat tinggal warga di wilayah desa.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK. Untuk pemohon non-warga terdaftar: catatan keterangan RT/RW/Kadus.',
                'assigned_role' => 'rw',
                'validity_days' => 90,
                'body' => 'adalah benar berdomisili di {{ alamat_domisili_saat_ini }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A05',
                'name' => 'Surat Keterangan Tidak Mampu',
                'description' => 'Keterangan status ekonomi tidak mampu untuk keperluan bantuan sosial/pendidikan.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK.',
                'assigned_role' => 'rw',
                'validity_days' => 180,
                'body' => 'adalah benar termasuk warga dengan kondisi ekonomi tidak mampu, digunakan untuk keperluan {{ keperluan_persyaratan }}.',
            ],
        //     [
        //         'code' => 'A06',
        //         'name' => 'Surat Keterangan Beda Nama',
        //         'description' => 'Keterangan perbedaan penulisan nama pada dokumen kependudukan.',
        //         'verification_type' => 'manual',
        //         'requirement_info' => 'KTP, KK, dokumen sumber nama yang benar (Akta/Ijazah), dokumen pendukung (opsional).',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'nama {{ nama_versi_1 }} dan {{ nama_yang_benar }} yang tercantum pada {{ sumber_dokumen_nama_benar }} Nomor {{ nomor_dokumen }} adalah benar merujuk pada orang yang sama, digunakan untuk keperluan {{ purpose }}.',
        //     ],
        //     [
        //         'code' => 'A07',
        //         'name' => 'Surat Keterangan Penguburan',
        //         'description' => 'Keterangan pelaksanaan penguburan/pemakaman.',
        //         'verification_type' => 'manual',
        //         'requirement_info' => 'Surat keterangan kematian, KK.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'telah dimakamkan pada {{ hari_pemakaman }} di {{ tempat_pemakaman }}, sebagaimana keterangan kematian yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'A08',
        //         'name' => 'Surat Keterangan Kelahiran',
        //         'description' => 'Keterangan kelahiran sebelum penerbitan akta kelahiran resmi.',
        //         'verification_type' => 'manual',
        //         'requirement_info' => 'Surat keterangan lahir dari RS/Bidan, KK.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'telah lahir seorang anak bernama {{ nama_anak }} di {{ tempat_lahir_anak }} pada {{ tanggal_lahir_anak }}, jenis kelamin {{ jenis_kelamin_anak }}, anak dari {{ nama_ayah }} dan {{ nama_ibu }}.',
        //     ],
            [
                'code' => 'A09',
                'name' => 'Surat Keterangan Belum Menikah',
                'description' => 'Keterangan status belum menikah untuk keperluan administratif.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK.',
                'assigned_role' => 'rw',
                'validity_days' => 90,
                'body' => 'berdasarkan data kependudukan yang ada, benar berstatus belum menikah, digunakan untuk keperluan {{ purpose }}.',
            ],
        //     [
        //         'code' => 'A10',
        //         'name' => 'Surat Keterangan Pertama Kali Memiliki Rumah',
        //         'description' => 'Keterangan status kepemilikan rumah pertama kali, untuk keperluan pengajuan KPR.',
        //         'verification_type' => 'manual',
        //         'requirement_info' => 'KK, keterangan penghasilan per bulan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'adalah benar untuk pertama kalinya akan memiliki rumah, dengan penghasilan kurang lebih Rp {{ penghasilan_per_bulan }} per bulan, digunakan untuk keperluan {{ purpose }}.',
        //     ],
        //     [
        //         'code' => 'A11',
        //         'name' => 'Surat Keterangan Ahli Waris',
        //         'description' => 'Keterangan pihak-pihak yang berhak sebagai ahli waris.',
        //         'verification_type' => 'manual',
        //         'requirement_info' => 'Akta kematian pewaris, KK.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'merupakan ahli waris yang sah dari almarhum/almarhumah {{ nama_almarhum }} yang meninggal dunia pada {{ hari_meninggal }} dan dimakamkan di {{ tpu_pemakaman }}.',
        //     ],
        //     [
        //         'code' => 'A12',
        //         'name' => 'Surat Keterangan Kegiatan/Acara',
        //         'description' => 'Keterangan penyelenggaraan kegiatan/acara warga (paket gabungan dengan No. 15 & 16).',
        //         'verification_type' => 'manual',
        //         'requirement_info' => 'Proposal kegiatan, Pernyataan Tanggung Jawab Acara (No. 15), Persetujuan Izin Lingkungan (No. 16).',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menerangkan pelaksanaan kegiatan {{ nama_kegiatan }} di {{ tempat_kegiatan }} pada {{ tanggal_kegiatan }} pukul {{ waktu_kegiatan }}, dengan maksud {{ maksud_kegiatan }}.',
        //     ],

        //     // ── Kategori A+C: Approval Normal + Dokumen Pendukung (No. 13) ──
        //     [
        //         'code' => 'AC01',
        //         'name' => 'Surat Keterangan Pengantar Permohonan SKCK',
        //         'description' => 'Pengantar untuk permohonan SKCK; proses TTD Camat menyusul di luar sistem.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'KK.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => 30,
        //         'body' => 'mengajukan permohonan pengantar untuk keperluan {{ keperluan_skck }}, dimohon dapat dipproses lebih lanjut di kepolisian setempat.',
        //     ],

        //     // ── Kategori C: Dokumen Pendukung, pengajuan surat sendiri (No. 15-16) ──
        //     [
        //         'code' => 'C01',
        //         'name' => 'Pernyataan Tanggung Jawab Acara',
        //         'description' => 'Dokumen pernyataan tanggung jawab penyelenggara atas suatu kegiatan/acara (download-print-isi manual-upload).',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Dokumen pernyataan bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan bertanggung jawab penuh atas segala hal yang terjadi selama pelaksanaan kegiatan yang diajukan.',
        //     ],
        //     [
        //         'code' => 'C02',
        //         'name' => 'Persetujuan/Izin Lingkungan',
        //         'description' => 'Persetujuan warga sekitar atas pelaksanaan suatu kegiatan/acara.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Daftar warga yang menyetujui, dokumen tanda tangan warga/RT/RW/Kadus.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan bahwa warga sekitar lokasi {{ lokasi_kegiatan }} telah menyetujui pelaksanaan kegiatan {{ nama_kegiatan }} pada {{ tanggal_kegiatan }}.',
        //     ],

        //     // ── Kategori B: Upload Mandiri / TTD eksternal (No. 17-25) ──────
        //     [
        //         'code' => 'B01',
        //         'name' => 'SPTJM Perkawinan/Perceraian Belum Tercatat',
        //         'description' => 'Surat Pernyataan Tanggung Jawab Mutlak atas perkawinan/perceraian yang belum tercatat.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data kedua pihak & saksi, daftar anak (jika ada), dokumen bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan dengan sebenarnya perihal perkawinan/perceraian antara {{ nama_pihak_pertama_suami }} dan {{ nama_pihak_kedua_istri }} pada {{ tanggal_perkawinan_perceraian }}, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B02',
        //         'name' => 'SPTJM Kebenaran Data Kelahiran',
        //         'description' => 'Surat Pernyataan Tanggung Jawab Mutlak atas kebenaran data kelahiran.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data ibu & anak, saksi, dokumen bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan dengan sebenarnya perihal kelahiran anak bernama {{ nama_anak }} di {{ tempat_tanggal_lahir_anak }}, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B03',
        //         'name' => 'SPTJM Kebenaran Sebagai Pasangan Suami Isteri',
        //         'description' => 'Surat Pernyataan Tanggung Jawab Mutlak atas status sebagai pasangan suami istri.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data pasangan, nomor KK, saksi, dokumen bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan dengan sebenarnya berstatus sebagai pasangan suami istri dengan {{ nama_pasangan }}, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B04',
        //         'name' => 'Surat Pernyataan Pengakuan Anak',
        //         'description' => 'Pernyataan pengakuan anak oleh ayah kandung.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data anak & ibu kandung, dokumen bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan mengakui anak bernama {{ nama_anak }} sebagai anak kandung, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B05',
        //         'name' => 'Surat Kuasa dalam Pelayanan Administrasi Kependudukan',
        //         'description' => 'Kuasa pengurusan administrasi kependudukan kepada pihak lain.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data penerima kuasa, alasan kuasa, dokumen bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'memberikan kuasa kepada {{ nama_penerima_kuasa }} untuk mengurus administrasi kependudukan dengan alasan {{ alasan_kuasa }}, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B06',
        //         'name' => 'Surat Pernyataan Alamat Digunakan dalam Adm. Kependudukan',
        //         'description' => 'Pernyataan pemilik rumah mengizinkan alamatnya digunakan pendatang untuk administrasi kependudukan.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data pendatang, dokumen bertanda tangan pemilik/RT/RW.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'mengizinkan alamat rumahnya digunakan oleh {{ nama_pendatang }} untuk keperluan administrasi kependudukan, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B07',
        //         'name' => 'Surat Pernyataan Menggunakan Alamat Rumah Milik Sendiri',
        //         'description' => 'Pernyataan bahwa alamat yang digunakan adalah rumah milik sendiri.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Dokumen bertanda tangan RT/RW.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan bahwa alamat yang digunakan adalah rumah milik sendiri, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B08',
        //         'name' => 'Surat Pernyataan Tidak Memiliki Dokumen Kependudukan',
        //         'description' => 'Pernyataan tidak memiliki dokumen kependudukan sama sekali.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data diri lengkap, dokumen bertanda tangan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'menyatakan tidak memiliki dokumen kependudukan apapun, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'B09',
        //         'name' => 'Surat Pernyataan Tidak Keberatan Numpang KK',
        //         'description' => 'Pernyataan pemilik KK tidak keberatan pihak lain numpang dalam KK-nya.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Nomor KK, data pihak yang numpang, dokumen bertanda tangan pemilik KK.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'tidak keberatan {{ nama_yang_numpang }} menumpang dalam Kartu Keluarga miliknya, sebagaimana dokumen bertanda tangan yang dilampirkan.',
        //     ],

        //     // ── Kategori D: Update Data Kependudukan (No. 26-30) ────────────
        //     [
        //         'code' => 'D01',
        //         'name' => 'Formulir Biodata Keluarga',
        //         'description' => 'Formulir biodata keluarga, disederhanakan untuk MVP dari 41 kolom form asli.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Nomor KK, daftar anggota keluarga, dokumen biodata.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'mengajukan pembaruan biodata keluarga sejumlah {{ jumlah_anggota_keluarga }} anggota, sebagaimana dokumen biodata yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'D02',
        //         'name' => 'Formulir Pendaftaran Peristiwa Kependudukan',
        //         'description' => 'Pendaftaran peristiwa kependudukan (KK Baru/KTP-el/KIA/Perubahan Data/Pindah Datang/dst).',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Nomor KK, jenis permohonan, dokumen persyaratan.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'mengajukan pendaftaran peristiwa kependudukan jenis {{ jenis_permohonan }}, sebagaimana dokumen persyaratan yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'D03',
        //         'name' => 'Formulir Pendaftaran Perpindahan Penduduk',
        //         'description' => 'Pendaftaran perpindahan penduduk (Surat Keterangan Pindah/SKPLN/SKTT).',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Nomor KK, alamat tujuan, alasan & jenis kepindahan, daftar anggota keluarga yang pindah.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'mengajukan pendaftaran perpindahan penduduk jenis {{ jenis_permohonan }} ke {{ alamat_tujuan }} dengan alasan {{ alasan_pindah }}.',
        //     ],
        //     [
        //         'code' => 'D04',
        //         'name' => 'Surat Pernyataan Perubahan Elemen Data Kependudukan',
        //         'description' => 'Pernyataan permohonan perubahan elemen data kependudukan.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Nomor KK, daftar perubahan data (elemen, nilai lama, nilai baru, dasar perubahan), dokumen pendukung.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'mengajukan perubahan elemen data kependudukan sebagaimana daftar perubahan dan dokumen pendukung yang dilampirkan.',
        //     ],
        //     [
        //         'code' => 'D05',
        //         'name' => 'Formulir Pelaporan Pencatatan Sipil di Dalam Wilayah NKRI',
        //         'description' => 'Pelaporan pencatatan sipil generik (Kelahiran/Kematian/Perkawinan/Perceraian/dst), versi MVP.',
        //         'verification_type' => 'document',
        //         'requirement_info' => 'Data subjek akta, jenis peristiwa, dokumen pendukung.',
        //         'assigned_role' => 'rw',
        //         'validity_days' => null,
        //         'body' => 'melaporkan peristiwa pencatatan sipil jenis {{ jenis_peristiwa }}, sebagaimana data subjek akta dan dokumen pendukung yang dilampirkan.',
        //     ],
        ];
    }
}