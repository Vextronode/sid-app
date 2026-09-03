<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\LetterType;
use Illuminate\Database\Seeder;

class LetterTypeSeeder extends Seeder
{
    /**
     * Seed 4 jenis surat keterangan:
     *   A01 - Surat Keterangan Usaha
     *   A04 - Surat Keterangan Domisili
     *   A05 - Surat Keterangan Tidak Mampu
     *   A09 - Surat Keterangan Belum Menikah
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
                    <td style="width: 18%; text-align: center; vertical-align: middle;">
                        {{ logo_img }}
                    </td>
                    <td style="width: 64%; text-align: center; vertical-align: middle;">
                        <div style="font-size: 12pt; font-weight: bold;">PEMERINTAH KABUPATEN PANGANDARAN</div>
                        <div style="font-size: 12pt; font-weight: bold;">KECAMATAN PARIGI</div>
                        <div style="font-size: 14pt; font-weight: bold;">DESA CIBENDA</div>
                        <div style="font-size: 9.5pt; margin-top: 2px;">Jl.Raya Cijulang Nomor.173.Tlp.0265.2640613</div>
                        <div style="font-size: 9.5pt; font-style: italic; color: #0000ff; text-decoration: underline;">email : kantordesacibenda@gmail.com</div>
                    </td>
                    <td style="width: 18%; text-align: right; vertical-align: bottom; font-size: 9.5pt;">
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
                    <td style="vertical-align: top; padding: 2px 0;">{{ village_head_name }}</td>
                </tr>
                <tr>
                    <td style="vertical-align: top; padding: 2px 0;">Jabatan</td>
                    <td style="vertical-align: top; padding: 2px 0;">:</td>
                    <td style="vertical-align: top; padding: 2px 0;">Kepala Desa {{ village_name_short }}</td>
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
            </table>
        </div>
        HTML;

        $signature = <<<HTML
        <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
                <td style="width: 50%;"></td>
                <td style="width: 50%; text-align: center;">
                    <p style="margin: 0;">Desa {{ village_name_short }}, {{ submitted_at }}</p>
                    <p style="margin: 2px 0 0 0;">Kepala Desa {{ village_name_short }}</p>
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
                    Orang tersebut diatas benar-benar warga kami dan perlu kami terangkan bahwa orang tersebut diatas benar-benar mempunyai kegiatan usaha &ldquo; {{ jenis_usaha }} &rdquo; di wilayah {{ lokasi_usaha }} Desa Cibenda Kecamatan Parigi Kabupaten Pangandaran Jawa Barat.
                </p>
                <p style="text-align: justify; text-indent: 40px; margin: 12px 0; line-height: 1.5;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya, mohon kepada yang bersangkutan agar menjadi maklum dan untuk menjadi bahan selanjutnya.
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
                        <td style="vertical-align: top; padding: 2px 0;">{{ child_name }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Tempat Tanggal Lahir</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ child_birth_place_date }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">NIK</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ child_nik }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Jenis Kelamin</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ child_gender }}</td>
                    </tr>
                    <tr>
                        <td style="vertical-align: top; padding: 2px 0;">Alamat</td>
                        <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
                        <td style="vertical-align: top; padding: 2px 0;">{{ child_address }}</td>
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
            [
                'code' => 'A01',
                'name' => 'Surat Keterangan Usaha',
                'description' => 'Keterangan kepemilikan/menjalankan usaha di wilayah desa.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, jenis & lokasi usaha.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 365,
                'body' => 'adalah benar memiliki/menjalankan usaha berupa {{ jenis_usaha }} yang berlokasi di {{ lokasi_usaha }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A09',
                'name' => 'Surat Keterangan Belum Menikah',
                'description' => 'Keterangan status belum menikah untuk keperluan administratif.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'berdasarkan data kependudukan yang ada, benar berstatus belum menikah, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A04',
                'name' => 'Surat Keterangan Domisili',
                'description' => 'Keterangan domisili/tempat tinggal warga di wilayah desa.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK. Untuk pemohon non-warga terdaftar: catatan keterangan RT/RW/Kadus.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'adalah benar berdomisili di wilayah desa, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A05',
                'name' => 'Surat Keterangan Tidak Mampu',
                'description' => 'Keterangan status ekonomi tidak mampu untuk keperluan bantuan sosial/pendidikan.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 180,
                'body' => 'adalah benar termasuk warga dengan kondisi ekonomi tidak mampu, digunakan untuk keperluan {{ keperluan_persyaratan }}.',
            ],
            [
                'code' => 'A02',
                'name' => 'Surat Keterangan Tidak Memiliki Rumah',
                'description' => 'Keterangan bahwa warga tidak memiliki rumah untuk keperluan bantuan atau administrasi.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, surat pengantar RT/RW.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'adalah benar tidak memiliki rumah dan membutuhkan keterangan ini untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A03',
                'name' => 'Surat Keterangan Penghasilan',
                'description' => 'Keterangan penghasilan untuk keperluan administrasi atau bantuan sosial.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, bukti penghasilan.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'berdasarkan data yang ada, penghasilan orang tersebut sebesar {{ penghasilan_perbulan }} per bulan dari pekerjaan {{ jenis_usaha }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A06',
                'name' => 'Surat Keterangan Beda Nama',
                'description' => 'Keterangan perubahan atau perbedaan nama berdasarkan dokumen pendukung.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, akta atau dokumen pendukung nama.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'bahwa yang bersangkutan menggunakan nama {{ nama_lama }}, dan nama yang benar menurut dokumen adalah {{ nama_benar }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A07',
                'name' => 'Surat Keterangan Penguburan',
                'description' => 'Keterangan kematian dan penguburan untuk keperluan administrasi keluarga.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, surat keterangan kematian.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'bahwa almarhum {{ nama_almarhum }} meninggal dunia pada tanggal {{ tanggal_meninggal }} di {{ tempat_meninggal }} dan dimakamkan di {{ tempat_pemakaman }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A08',
                'name' => 'Surat Keterangan Kelahiran',
                'description' => 'Keterangan kelahiran untuk keperluan administrasi kartu keluarga atau akta kelahiran.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, akta kelahiran atau keterangan bidan.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'bahwa anak bernama {{ nama_anak }} lahir pada tanggal {{ tanggal_lahir_anak }} di {{ tempat_lahir_anak }}, dari pasangan {{ nama_ayah }} dan {{ nama_ibu }}, digunakan untuk keperluan {{ purpose }}.',
            ],
            [
                'code' => 'A10',
                'name' => 'Surat Keterangan & Pertama Kali Memiliki Rumah',
                'description' => 'Keterangan bahwa warga pertama kali memiliki rumah di alamat yang dinyatakan.',
                'verification_type' => 'manual',
                'requirement_info' => 'KTP, KK, bukti kepemilikan rumah.',
                'assigned_role' => 'kasi_pelayanan',
                'validity_days' => 90,
                'body' => 'bahwa yang bersangkutan adalah warga kami yang pertama kali memiliki rumah di alamat {{ alamat_rumah }}, digunakan untuk keperluan {{ purpose }}.',
            ],
        ];
    }
}
