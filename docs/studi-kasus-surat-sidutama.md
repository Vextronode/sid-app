# Studi Kasus Pengajuan Surat SIDUTama

Dokumen ini menjelaskan alur pengajuan **semua jenis surat** di SIDUTama dari sudut pandang warga: kejadian apa yang dialami, surat apa yang dipilih di katalog web, apa yang diisi, siapa yang memproses, dan dokumen apa yang akhirnya dibawa ke mana.

Nama surat di dokumen ini ditulis persis seperti yang tampil di kartu pilihan pada halaman **Ajukan Surat**. Semua tokoh dan data adalah contoh fiktif.

---

## Daftar Isi

1. [Dua Kategori Surat](#1-dua-kategori-surat)
2. [Alur Umum Persuratan Desa](#2-alur-umum-persuratan-desa)
3. [Alur Umum Layanan Kependudukan](#3-alur-umum-layanan-kependudukan)
4. [Katalog: Kejadian → Surat yang Dipilih](#4-katalog-kejadian--surat-yang-dipilih)
5. [Studi Kasus Persuratan Desa](#5-studi-kasus-persuratan-desa)
6. [Studi Kasus Layanan Kependudukan](#6-studi-kasus-layanan-kependudukan)
7. [Studi Kasus Gabungan (Satu Kejadian, Beberapa Surat)](#7-studi-kasus-gabungan-satu-kejadian-beberapa-surat)
8. [Situasi Khusus yang Berlaku di Semua Surat](#8-situasi-khusus-yang-berlaku-di-semua-surat)

---

## 1. Dua Kategori Surat

Di halaman Ajukan Surat, kartu jenis surat dikelompokkan menjadi dua:

| | **Persuratan Desa** | **Layanan Kependudukan** |
|---|---|---|
| Isinya | Surat keterangan yang dikeluarkan desa | Formulir kependudukan (format Disdukcapil) |
| Dipakai untuk | Bank, sekolah, kantor, BPJS, KPR, bantuan sosial, dll. | Diurus lanjut ke **Disdukcapil** (akta, KK, KTP-el, surat pindah) |
| Nomor surat desa | Ada | Tidak ada |
| TTD Kepala Desa | Ada, sebagai pengesahan surat (TTD + stempel desa) | Tidak ada pengesahan Kepala Desa; persetujuan RT dan Kepala Desa tetap tercatat di sistem. Kepala Desa hanya bertanda tangan sebagai "mengetahui" di Formulir Pelaporan Pencatatan Sipil (F-2.01) |
| Format unduhan | **TTD & stempel digital** atau **Untuk tanda tangan basah** (kosong, dicetak lalu ditandatangani dan distempel) | **TTD digital** (TTD pemohon dari akun dan TTD pejabat terkait ditempel otomatis) atau **TTD basah** (semua kolom tanda tangan kosong) |
| Petugas desa yang menangani | Kaur TU & Umum | Kasi Pemerintahan |
| Setelah terbit | Surat langsung dipakai | Warga mengurus ke Disdukcapil, lalu **mengunggah hasilnya** kembali di web |
| Masa berlaku | Tertulis di kartu ("Berlaku N hari") | Tidak ada |

Pengecualian: **Surat Keterangan Ahli Waris** tampil di Layanan Kependudukan dan ditangani Kasi Pemerintahan, tetapi tetap berupa surat keterangan desa: bernomor, ditandatangani Kepala Desa, langsung dipakai tanpa unggah hasil, dan tanpa masa berlaku.

Daftar jenis surat:

**Persuratan Desa (10 surat)**

1. Surat Keterangan Usaha
2. Surat Keterangan Tidak Memiliki Rumah
3. Surat Keterangan Penghasilan
4. Surat Keterangan Domisili
5. Surat Keterangan Tidak Mampu
6. Surat Keterangan Beda Nama
7. Surat Keterangan Penguburan
8. Surat Keterangan Kelahiran
9. Surat Keterangan Belum Menikah
10. Surat Keterangan & Pertama Kali Memiliki Rumah

**Layanan Kependudukan (11 surat)**

1. Surat Keterangan Ahli Waris (surat keterangan desa, ditangani Kasi Pemerintahan)
2. Surat Pernyataan Tidak Memiliki Dokumen Kependudukan
3. Perubahan Elemen Data Kependudukan
4. Pindah Keluar
5. Pindah Datang
6. Pelaporan Kelahiran
7. Pelaporan Kematian
8. Pelaporan Perkawinan/Perceraian
9. Pengakuan Anak
10. Perubahan Susunan KK
11. Pelaporan Pengangkatan Anak

---

## 2. Alur Umum Persuratan Desa

```
Warga                      RT                 Kepala Desa / Sekdes        Kaur TU & Umum
  │ pilih surat & isi form  │                        │                            │
  ├────── Kirim ───────────►│ setujui / tolak        │                            │
  │   status: Menunggu      ├───────────────────────►│ setujui / tolak            │
  │                         │ (RW & Kadus dapat      ├───────────────────────────►│ menerima surat final;
  │                         │  pemberitahuan)        │  surat bernomor + TTD      │ Terapkan bila surat
  │◄──────────── status: Disetujui, surat bisa diunduh ─────────────────────────│ mengubah data warga
  │ unduh PDF → bawa ke pihak yang meminta
```

Langkah dari sisi warga:

1. Masuk ke akun, buka **Ajukan Surat**.
2. Di kelompok **Persuratan Desa**, cari dan klik kartu nama surat. Kartu menampilkan deskripsi, masa berlaku ("Berlaku N hari"), dan bagian **Siapkan:** bila ada persyaratan.
3. Data diri pemohon (nama, NIK, tempat/tanggal lahir, jenis kelamin, alamat) **terisi otomatis dari akun**. Warga hanya mengisi isian tambahan khusus surat itu.
4. Kirim. Status surat: **Menunggu** → **Sedang Diproses** → **Disetujui** (atau **Ditolak** beserta alasannya).
5. Persetujuan dua tahap: **Ketua RT**, lalu **Kepala Desa** (Sekretaris Desa dapat menggantikan bila Kepala Desa berhalangan). RW dan Kepala Dusun hanya mendapat pemberitahuan setelah RT menyetujui. Secara default tiap tahap punya tenggat 24 jam dengan pengingat 12 jam sebelum tenggat; Staf SIDUTama dapat mengubah angka ini.
6. Setelah disetujui, surat terbit dengan **nomor surat dan tanda tangan Kepala Desa**. Warga mengunduh PDF dari daftar surat dalam salah satu format:
   - **TTD & stempel digital**: TTD Kepala Desa dan stempel desa sudah tercetak, siap diserahkan;
   - **Untuk tanda tangan basah**: tanpa TTD dan stempel, untuk dicetak lalu ditandatangani dan distempel basah di kantor desa.
7. Surat yang sudah final diteruskan ke **Kaur TU & Umum**. Untuk surat yang mengubah data penduduk (Penguburan, Kelahiran), hanya Kaur TU & Umum yang dapat menekan **Terapkan**; surat lain tidak memerlukan tindakan lanjutan.

---

## 3. Alur Umum Layanan Kependudukan

```
Warga                 Saksi/Pihak lain      RT → Kepala Desa      Disdukcapil         Kasi Pemerintahan
  │ pilih layanan,         │                      │                    │                      │
  │ isi form, isi NIK saksi│                      │                    │                      │
  ├──── Kirim ────────────►│ setujui permintaan   │                    │                      │
  │                        ├─────────────────────►│ setujui            │                      │
  │◄──────── formulir terbit (cetak) ─────────────┤                    │                      │
  │ tanda tangan / materai, bawa formulir + lampiran ─────────────────►│ terbitkan KK/akta    │
  │◄────────────────────────────────────────────── dokumen hasil ──────┤                      │
  │ Unggah hasil di surat yang sama ─────────────────────────────────────────────────────────►│ terima / tolak
  │                                                                                            │ Terapkan → data desa
  │◄──────────────────────────────────── selesai, data desa sudah diperbarui ──────────────────┤ diperbarui
```

Langkah dari sisi warga:

1. Buka **Ajukan Surat**, pilih kartu di kelompok **Layanan Kependudukan**.
2. Setelah kartu dipilih, muncul kotak **Dokumen yang dibawa ke Disdukcapil**, berisi:
   - *Formulir yang terbit dari pengajuan ini (dicetak)*, dan
   - *Dokumen lain yang perlu dibawa* (KK asli, KTP-el, buku nikah, dsb.).
   Gunakan daftar ini sebagai checklist sebelum berangkat.
3. Isi form. Anggota keluarga dipilih langsung dari **daftar anggota KK** pemohon, jadi datanya tidak perlu diketik ulang.
4. **Saksi**: banyak layanan meminta dua saksi. Warga cukup mengisi NIK saksi.
   - Saksi yang punya akun SIDUTama menerima **Permintaan Tanda Tangan & Saksi** di halaman Profil dan harus menyetujuinya.
   - Saksi warga desa tanpa akun akan diverifikasi oleh RT.
   - Saksi dari luar desa dicatat sebagai isian manual.
   Surat baru masuk tahap persetujuan setelah semua saksi terisi.
5. Pertanyaan di akhir form: **Siapa yang Akan Mengurus Formulir Ini ke Disdukcapil?**
   - *Saya sendiri*, atau
   - *Diwakilkan kepada orang lain*. Isi NIK penerima kuasa; Surat Kuasa ikut terbit.
6. Persetujuan RT → Kepala Desa, sama seperti Persuratan Desa.
7. Formulir terbit **tanpa nomor surat desa dan tanpa pengesahan Kepala Desa**. Bila ada beberapa formulir, warga memilih format unduhan lalu mengunduh tiap formulir:
   - **TTD digital**: TTD pemohon dari akunnya dan TTD pejabat terkait ditempel otomatis (Kasi Pemerintahan di F-1.02, Kepala Desa sebagai "mengetahui" di F-2.01, Ketua RT/RW di surat pernyataan pendatang). Penanda tangan yang belum punya TTD di akunnya dibiarkan kosong.
   - **TTD basah**: semua kolom tanda tangan kosong, untuk ditandatangani langsung.

   Kolom materai dan tanda tangan pihak di luar akun (saksi, pemilik rumah, dsb.) tetap ditandatangani langsung di kertas. Formulir dibawa ke Disdukcapil bersama lampiran.
8. Setelah Disdukcapil menerbitkan dokumen (KK baru, akta, surat pindah, dsb.), warga **membuka surat yang sama di web** dan menekan **Unggah hasil**. Kotak *Yang perlu diunggah* menjelaskan dokumen yang dimaksud.
9. **Kasi Pemerintahan** (hanya pejabat yang ditugaskan pada jenis surat itu) memeriksa unggahan:
   - *Diterima*: Kasi menekan **Terapkan**, dan data penduduk/KK di desa ikut diperbarui.
   - *Ditolak*: warga cukup **Unggah ulang**, tanpa mengajukan surat baru.

---

## 4. Katalog: Kejadian → Surat yang Dipilih

Tabel cepat untuk menjawab: "Saya mengalami X, surat apa yang saya pilih?"

| Kejadian / Kebutuhan warga | Kategori | Pilih kartu |
|---|---|---|
| Punya usaha, butuh bukti untuk pinjaman/izin | Persuratan Desa | Surat Keterangan Usaha |
| Butuh bukti penghasilan (bansos, beasiswa, kredit) | Persuratan Desa | Surat Keterangan Penghasilan |
| Mengajukan KPR rumah pertama | Persuratan Desa | Surat Keterangan & Pertama Kali Memiliki Rumah |
| Belum punya rumah, butuh bukti untuk bantuan rumah | Persuratan Desa | Surat Keterangan Tidak Memiliki Rumah |
| Butuh bukti tinggal di desa (termasuk pendatang/ngontrak) | Persuratan Desa | Surat Keterangan Domisili |
| Anak daftar beasiswa/sekolah, keluarga tidak mampu | Persuratan Desa | Surat Keterangan Tidak Mampu |
| Nama berbeda di KK, ijazah, akta, dll. | Persuratan Desa | Surat Keterangan Beda Nama |
| Melamar kerja/ikut seleksi yang minta status lajang | Persuratan Desa | Surat Keterangan Belum Menikah |
| Bayi lahir, butuh surat keterangan dari desa (kantor, BPJS, tunjangan) | Persuratan Desa | Surat Keterangan Kelahiran |
| Bayi lahir, mau dibuatkan **akta kelahiran & KK baru** | Layanan Kependudukan | Pelaporan Kelahiran |
| Anggota keluarga meninggal, butuh surat keterangan pemakaman | Persuratan Desa | Surat Keterangan Penguburan |
| Anggota keluarga meninggal, mau dibuatkan **akta kematian** | Layanan Kependudukan | Pelaporan Kematian |
| Mengurus warisan (bank, tanah, BPJS almarhum) | Layanan Kependudukan | Surat Keterangan Ahli Waris |
| Baru menikah / bercerai, mau dicatat di Disdukcapil | Layanan Kependudukan | Pelaporan Perkawinan/Perceraian |
| Pasangan baru mau punya KK sendiri / pisah KK / ganti kepala keluarga / numpang KK | Layanan Kependudukan | Perubahan Susunan KK |
| Pendidikan, pekerjaan, agama, atau status kawin di KK sudah tidak sesuai | Layanan Kependudukan | Perubahan Elemen Data Kependudukan |
| Pindah ke luar desa / luar negeri | Layanan Kependudukan | Pindah Keluar |
| Ada saudara/penghuni baru yang pindah ke desa | Layanan Kependudukan | Pindah Datang |
| Ada anggota keluarga yang belum pernah punya KK/KTP-el | Layanan Kependudukan | Surat Pernyataan Tidak Memiliki Dokumen Kependudukan |
| Ayah biologis ingin namanya tercantum di akta anak | Layanan Kependudukan | Pengakuan Anak |
| Mengangkat anak (sudah ada penetapan pengadilan) | Layanan Kependudukan | Pelaporan Pengangkatan Anak |

---

## 5. Studi Kasus Persuratan Desa

Semua kasus di bagian ini mengikuti [Alur Umum Persuratan Desa](#2-alur-umum-persuratan-desa). Yang dijelaskan di bawah hanya bagian yang khas untuk tiap surat.

### 5.1 Surat Keterangan Usaha

**Kasus: Joni membuka warung kopi**

Joni baru membuka warung kopi di depan rumahnya. Ia ingin mengajukan pinjaman modal KUR ke bank, dan bank meminta surat keterangan usaha dari desa.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Usaha** (berlaku 365 hari). Bagian *Siapkan:* meminta **foto usaha terkini**.
- **Yang diisi:**
  - Jenis Usaha: `Warung kopi`
  - Foto Usaha Terkini: foto warung Joni
- **Proses:** Ketua RT melihat foto warung sebagai bahan pertimbangan, lalu menyetujui. Kepala Desa ikut menyetujui. Foto tidak dicetak di surat.
- **Hasil:** Surat keterangan bahwa Joni menjalankan usaha "Warung kopi" di wilayah desa. Joni mengunduh PDF dan membawanya ke bank.

**Skenario lain:** Siti, penjahit rumahan, butuh SKU untuk mendaftar UMKM binaan dinas koperasi. Alurnya sama, Jenis Usaha diisi `Jasa jahit pakaian`.

### 5.2 Surat Keterangan Tidak Memiliki Rumah

**Kasus: Dedi mendaftar program bantuan rumah**

Dedi, buruh tani, tinggal menumpang di rumah orang tuanya. Ia mendaftar program bantuan perumahan yang mensyaratkan surat keterangan belum memiliki rumah.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Tidak Memiliki Rumah** (berlaku 90 hari).
- **Yang diisi:** tidak ada isian tambahan. Data Dedi diambil dari akunnya.
- **Proses:** Ketua RT memastikan Dedi memang tidak memiliki rumah, lalu menyetujui. Berikutnya Kepala Desa menyetujui.
- **Hasil:** Surat keterangan bahwa Dedi tidak memiliki rumah, dibawa ke panitia program bantuan.

### 5.3 Surat Keterangan Penghasilan

**Kasus: Rina mendaftarkan anaknya ke beasiswa**

Rina berdagang sayur di pasar. Sekolah anaknya meminta surat keterangan penghasilan orang tua untuk seleksi beasiswa.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Penghasilan** (berlaku 90 hari).
- **Yang diisi:**
  - Bidang Usaha / Mata Pencaharian: dipilih dari katalog pekerjaan desa, awalnya terisi pekerjaan Rina di data penduduk (`Pedagang`). Bila tidak ada di katalog, pilih **Lainnya** lalu ketik sendiri (mis. `Perdagangan sayur`); teks ini hanya tercetak di surat, tidak masuk katalog.
  - Penghasilan per Bulan (Rp): `2500000`
- **Hasil:** Surat menyebut penghasilan Rp 2.500.000,- *(dua juta lima ratus ribu rupiah)* per bulan. Angka terbilang dibuat otomatis. Rina menyerahkannya ke sekolah.

### 5.4 Surat Keterangan Domisili

**Skenario A: warga asli desa**

Agus, warga desa ber-KTP desa, butuh surat domisili untuk membuka rekening di bank cabang kecamatan.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Domisili** (berlaku 90 hari).
- **Yang diisi:** Alamat Domisili Saat Ini: pilih Dusun, RW, lalu RT dari data wilayah desa. Awalnya terisi RT Agus di data penduduk; bisa diganti bila ia tinggal di RT lain.
- **Hasil:** Surat menyatakan Agus "benar-benar warga masyarakat Desa kami" dan berdomisili di alamat tersebut.

**Skenario B: pendatang (ngontrak)**

Fajar ber-KTP luar daerah, tetapi sudah setahun mengontrak dan bekerja di desa. Ia terdaftar di SIDUTama sebagai penduduk berstatus pendatang. Kantornya meminta surat domisili.

- **Pilih di web:** kartu yang sama.
- **Hasil:** Redaksi surat otomatis berubah menjadi "bukan warga masyarakat Desa kami, namun ... saat ini tinggal dan berdomisili di alamat ...". Warga tidak perlu memilih redaksi sendiri.

### 5.5 Surat Keterangan Tidak Mampu

**Kasus: Ujang mengurus keringanan biaya kuliah anaknya**

Ujang, buruh harian, ingin anaknya Dinda mendapat keringanan UKT di kampus negeri.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Tidak Mampu** (berlaku 180 hari).
- **Yang diisi:**
  - NIK Dinda (wajib). Bila Dinda terdaftar di desa, nama, tempat/tanggal lahir, jenis kelamin, dan alamatnya diambil dari data penduduk; bila tidak, diketik.
  - Untuk Melengkapi Persyaratan: `pengajuan keringanan UKT`
- **Proses:** Ketua RT menilai kondisi ekonomi keluarga Ujang. Bila sesuai, RT dan kemudian Kepala Desa menyetujui. Bila RT menolak, alasannya tampil di detail surat.
- **Hasil:** Surat menyatakan Ujang tidak mampu, selaku orang tua dari Dinda, untuk melengkapi persyaratan pengajuan keringanan UKT.

### 5.6 Surat Keterangan Beda Nama

**Kasus: nama Siti Aminah tertulis berbeda-beda**

Di KK anak-anaknya, nama ibu tertulis "SITI AMINAH". Di KK lain tertulis "SITI AMINA", padahal di akta kelahirannya tertulis "SITI AMINAH". Bank menolak pencairan tabungan pendidikan anaknya karena perbedaan ini.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Beda Nama** (berlaku 90 hari).
- **Yang diisi:**
  - Nama yang Berbeda (satu nama per baris beserta dokumennya):
    ```
    SITI AMINA (KK an. Budi)
    SITI AMINAH (KK an. Rudi)
    ```
  - Dokumen yang Memuat Nama yang Benar: `Akta Kelahiran`
  - Nomor Dokumen: nomor akta kelahiran
  - Nama yang Benar: awalnya terisi nama Siti di data penduduk (`SITI AMINAH`), bisa diubah.
- **Hasil:** Surat menyatakan nama-nama tersebut merujuk ke orang yang sama, dengan nama yang benar sesuai akta kelahiran. Siti membawanya ke bank.

### 5.7 Surat Keterangan Penguburan

**Kasus: Pak Karta meninggal dunia**

Pak Karta, warga desa, wafat di rumah karena sakit dan dimakamkan keesokan harinya di TPU desa. Anaknya, Herman, membutuhkan surat keterangan penguburan untuk klaim santunan kematian.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Penguburan** (berlaku 90 hari). Pemohonnya adalah Herman.
- **Yang diisi:**
  - NIK almarhum (opsional, tetapi sebaiknya diisi). Bila terdaftar di desa (termasuk yang datanya sudah nonaktif), nama, tempat/tanggal lahir, jenis kelamin, dan alamat diambil dari data penduduk; bila tidak atau NIK dikosongkan, diketik.
  - Tanggal Meninggal, Tempat Meninggal, Sebab Meninggal (opsional)
  - Tanggal Pemakaman, Tempat Pemakaman
- **Proses:** Disetujui RT → Kepala Desa. Setelah itu Kaur TU & Umum menekan **Terapkan**, dan data warga Pak Karta **dinonaktifkan** (meninggal dunia). Bila NIK almarhum kosong atau salah, Kaur melengkapinya saat Terapkan.
- **Hasil:** Surat keterangan penguburan, dibawa ke kantor penyalur santunan.
- **Lanjutan:** untuk akta kematian, lihat [Kasus Gabungan 7.3](#73-kematian-anggota-keluarga-pak-karta).

### 5.8 Surat Keterangan Kelahiran

**Kasus: Bambang butuh bukti kelahiran untuk tunjangan anak di kantor**

Istri Bambang baru melahirkan. Kantor Bambang meminta surat keterangan kelahiran dari desa untuk mengurus tunjangan anak, sementara akta kelahiran belum terbit.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Kelahiran** (berlaku 90 hari). Pemohon adalah salah satu orang tua; datanya diambil dari akun.
- **Yang diisi:**
  - NIK pasangan (wajib). Bila pasangan warga desa, datanya diambil dari data penduduk; bila tidak, diketik.
  - Data anak: nama, tempat/tanggal lahir, NIK (boleh kosong karena bayi belum punya NIK), jenis kelamin, alamat (awalnya terisi alamat pemohon)
- **Proses:** Disetujui RT → Kepala Desa. Kaur TU & Umum menekan **Terapkan** untuk menambahkan anak ke data warga desa. NIK anak boleh dilengkapi saat itu.
- **Hasil:** Surat keterangan bahwa pasangan tersebut memiliki anak dengan identitas di surat, dibawa ke bagian SDM kantor.
- **Catatan:** Surat ini **tidak menggantikan** akta kelahiran. Untuk akta dan KK baru, gunakan **Pelaporan Kelahiran** (lihat [Kasus Gabungan 7.1](#71-kelahiran-anak-keluarga-bambang)).

### 5.9 Surat Keterangan Belum Menikah

**Kasus: Lina mendaftar seleksi kerja**

Lina, lulusan SMK, mendaftar sebagai pramugari. Salah satu syaratnya adalah surat keterangan belum menikah.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan Belum Menikah** (berlaku 90 hari).
- **Yang diisi:** tidak ada isian tambahan.
- **Hasil:** Surat keterangan berstatus belum menikah, diunggah ke portal rekrutmen.

### 5.10 Surat Keterangan & Pertama Kali Memiliki Rumah

**Kasus: Andi mengajukan KPR subsidi**

Andi, karyawan pabrik, ingin membeli rumah pertama lewat KPR bersubsidi. Bank meminta surat keterangan dari desa bahwa ini rumah pertamanya, beserta rata-rata penghasilannya.

- **Pilih di web:** Persuratan Desa → **Surat Keterangan & Pertama Kali Memiliki Rumah** (berlaku 90 hari).
- **Yang diisi:** Rata-rata Penghasilan per Bulan (Rp): `4000000`.
- **Hasil:** Surat menyatakan Andi baru pertama kali memiliki rumah dengan rata-rata penghasilan Rp 4.000.000,-/bulan, untuk melengkapi persyaratan KPR.
- **Variasi:** bila bank juga meminta bukti penghasilan terpisah atau status lajang, Andi mengajukan **Surat Keterangan Penghasilan** dan/atau **Surat Keterangan Belum Menikah** sebagai pengajuan terpisah.

### 5.11 Surat Keterangan Ahli Waris

**Kasus: Nurhayati mencairkan tabungan almarhum suaminya**

Suami Nurhayati telah meninggal dan dimakamkan di TPU Cibenda. Bank meminta surat keterangan ahli waris untuk mencairkan tabungan almarhum.

- **Pilih di web:** Layanan Kependudukan → **Surat Keterangan Ahli Waris** (tanpa masa berlaku, karena status ahli waris tidak kedaluwarsa). Pemohon adalah ahli waris. Setelah terbit, surat ditangani Kasi Pemerintahan.
- **Yang diisi:**
  - NIK almarhum (opsional, tetapi sebaiknya diisi). Bila terdaftar di desa (termasuk yang datanya sudah nonaktif), nama, tempat/tanggal lahir, jenis kelamin, alamat, dan pekerjaan diambil dari data penduduk; bila tidak atau NIK dikosongkan, diketik.
  - Pekerjaan Almarhum (terisi otomatis dari data penduduk bila NIK ditemukan)
  - Tanggal Meninggal
  - Nama TPU: `Cibenda`
- **Hasil:** Surat menyatakan Nurhayati benar ahli waris almarhum dan bertanggung jawab bila di kemudian hari ada pihak lain yang mengaku sebagai ahli waris. Dokumen dibawa ke bank.

---

## 6. Studi Kasus Layanan Kependudukan

Semua kasus di bagian ini mengikuti [Alur Umum Layanan Kependudukan](#3-alur-umum-layanan-kependudukan): pilih layanan, isi form, saksi menyetujui, RT dan Kepala Desa menyetujui, formulir dicetak dan dibawa ke Disdukcapil, hasil diunggah, Kasi Pemerintahan memverifikasi lalu menerapkan.

**Batas waktu pelaporan.** Bila tanggal peristiwa yang diisi sudah melewati batas pelaporan, form menampilkan peringatan, tetapi pengajuan tetap bisa dikirim. Disdukcapil dapat mengenakan denda administratif keterlambatan.

| Peristiwa | Batas sejak peristiwa |
|---|---|
| Kelahiran | 60 hari |
| Kematian | 30 hari |
| Perkawinan dan perceraian yang dicatatkan ke Disdukcapil (selain Islam) | 60 hari (perceraian: sejak putusan) |
| Pengangkatan anak | 30 hari sejak penetapan pengadilan |

### 6.1 Surat Pernyataan Tidak Memiliki Dokumen Kependudukan

**Kasus: Mak Iyah belum pernah punya KK dan KTP-el**

Mak Iyah (70 tahun) tinggal bersama anaknya, Wawan, tetapi tidak pernah tercatat di KK mana pun dan belum pernah membuat KTP-el.

- **Pilih di web:** Layanan Kependudukan → **Surat Pernyataan Tidak Memiliki Dokumen Kependudukan**. Pemohonnya Wawan sebagai keluarga yang akan menampung Mak Iyah di KK-nya.
- **Yang diisi:** data Mak Iyah, yaitu nama lengkap, tempat/tanggal lahir, jenis kelamin, nama ibu kandung, golongan darah (opsional), pendidikan terakhir, alamat di desa, dan **Hubungan dengan Kepala Keluarga Anda** (mis. *Orang Tua*).
- **Terbit:** surat pernyataan (F-1.04), Formulir Pendaftaran Peristiwa Kependudukan (F-1.02, dicentang *Perubahan Data KK: Menumpang dalam KK*), dan Biodata Keluarga (F-1.01) berisi susunan KK Wawan dengan Mak Iyah di baris terakhir.
- **Dibawa ke Disdukcapil:**
  - Surat pernyataan yang terbit, ditandatangani Mak Iyah di atas materai
  - Formulir F-1.02 dan F-1.01 yang terbit
  - KK asli Wawan
  - Dokumen identitas pendukung bila ada
- **Unggah hasil:** KK dan/atau KTP-el yang terbit.
- **Setelah diterima:** Kasi Pemerintahan menekan Terapkan. Mak Iyah ditambahkan sebagai warga di KK Wawan, dengan NIK diisi Kasi dari dokumen terbitan Disdukcapil.

### 6.2 Perubahan Elemen Data Kependudukan

**Skenario A: pendidikan dan pekerjaan berubah**

Di KK, Dimas masih tercatat berpendidikan "SMA" dan bekerja sebagai "Pelajar/Mahasiswa". Ia sudah lulus S1 dan bekerja sebagai guru. Ayahnya, Pak Hasan (kepala keluarga), ingin KK diperbarui.

- **Pilih di web:** Layanan Kependudukan → **Perubahan Elemen Data Kependudukan**.
- **Yang diisi:**
  - Anggota yang Datanya Berubah: pilih **Dimas** dari daftar anggota KK. Nilai "Semula" diambil otomatis dari data warga.
    - Pendidikan Terakhir Menjadi: `S1`, dasar perubahan: `Ijazah S1`
    - Pekerjaan Menjadi: `Guru`, dasar perubahan: `Surat keterangan kerja`
    - Agama dan status perkawinan dikosongkan karena tetap
  - Ada perkawinan/perceraian yang belum tercatat?: `Tidak`
- **Dibawa ke Disdukcapil:**
  - Surat Pernyataan Perubahan Elemen Data dan Formulir Pendaftaran Peristiwa Kependudukan
  - KK asli
  - Ijazah dan surat keterangan kerja
- **Unggah hasil:** KK terbaru. Setelah diterima, Kasi menekan Terapkan, dan pendidikan serta pekerjaan Dimas di data desa ikut berubah.

**Skenario B: beberapa anggota sekaligus, termasuk status kawin yang belum tercatat**

Pak Hasan juga ingin mengubah status kawin anak perempuannya, Wulan, yang sudah menikah secara agama tetapi belum punya buku nikah.

- Tambahkan baris kedua untuk **Wulan**: Status Perkawinan Menjadi `Kawin`, dasar: `SPTJM`.
- Ada perkawinan/perceraian yang belum tercatat?: `Ya, belum tercatat`. Muncul isian tambahan: peristiwa (*Perkawinan*), tanggal, nama dan NIK suami dan istri, **dua saksi**, dan anak dari perkawinan tersebut (bila ada).
- Formulir tambahan yang ikut terbit: **SPTJM Perkawinan/Perceraian Belum Tercatat**, ditandatangani di atas materai bersama dua saksi. Bawa juga KTP-el kedua saksi.

### 6.3 Pindah Keluar

**Skenario A: sekeluarga pindah ke kota lain**

Keluarga Pak Rahmat (suami, istri, dua anak) pindah ke Jakarta Barat karena pekerjaan.

- **Pilih di web:** Layanan Kependudukan → **Pindah Keluar**.
- **Yang diisi:**
  - Kewarganegaraan yang Pindah: `WNI (anggota KK saya)`
  - Jenis Permohonan: `Surat Keterangan Pindah`
  - Alamat tujuan lengkap (jalan, RT/RW, desa, kecamatan, kabupaten/kota, provinsi) dan Klasifikasi Pindah: `Antar provinsi`
  - Alasan Pindah: `Pekerjaan`
  - Jenis Kepindahan: `Kepala Keluarga dan Seluruh Anggota Keluarga`
  - Anggota Keluarga yang Pindah: centang semua anggota
- **Dibawa ke Disdukcapil:** Formulir Permohonan Pindah, KK asli, dan KTP-el anggota yang pindah.
- **Unggah hasil:** Surat Keterangan Pindah (SKPWNI). Setelah diterima, Kasi menekan Terapkan, dan seluruh anggota beserta akunnya **dinonaktifkan** dari data desa.

**Skenario B: sebagian anggota pindah, termasuk kepala keluarga**

Pak Rahmat pindah sendiri untuk bekerja, sementara istri dan anak-anak tetap tinggal di desa.

- Jenis Kepindahan: `Kepala Keluarga`. Anggota Keluarga yang Tidak Pindah: `Membuat KK Baru`.
- **Kepala Keluarga Baru bagi Anggota yang Tetap Tinggal**: wajib dipilih, misalnya istrinya, Bu Ani.
- Formulir tambahan yang terbit: Formulir Pendaftaran Peristiwa Kependudukan untuk KK yang ditinggalkan (dicentang penggantian kepala keluarga), dan Formulir Biodata Keluarga berisi susunan KK yang tinggal dengan Bu Ani di baris pertama sebagai kepala keluarga.
- **Unggah hasil:** SKPWNI dan KK baru untuk keluarga yang tetap tinggal. Setelah Terapkan, Pak Rahmat dinonaktifkan dan Bu Ani ditetapkan sebagai kepala keluarga.

**Skenario C: pindah ke luar negeri**

Reza pindah untuk bekerja di Malaysia.

- Jenis Permohonan: `Surat Keterangan Pindah Luar Negeri (SKPLN)`. Isi negara tujuan, alamat di luar negeri, penanggung jawab, dan rencana tanggal pindah.

**Skenario D: orang asing pindah, diajukan lewat warga**

Pak Joko memiliki rumah kontrakan yang dihuni Mr. Lee, pemegang ITAS. Mr. Lee akan pindah ke kota lain, dan Pak Joko mengajukan pindahnya sebagai perantara.

- Kewarganegaraan yang Pindah: `WNA (orang asing, saya sebagai perantara)`. Isi nama sesuai paspor, alamat di desa, tipe sponsor, nomor dan masa berlaku ITAS/ITAP, alamat tujuan, dan daftar orang asing yang pindah.
- **Unggah hasil:** SKTT dari Disdukcapil. Karena orang asing tidak tercatat sebagai warga desa, Kasi cukup menandai selesai.

### 6.4 Pindah Datang

**Skenario A: adik ikut numpang KK**

Tono, adik Bu Sri, pindah dari Bandung untuk bekerja di desa dan akan masuk ke KK Bu Sri.

- **Pilih di web:** Layanan Kependudukan → **Pindah Datang**. Pemohonnya Bu Sri sebagai perantara.
- **Yang diisi:**
  - Tempat Tinggal Pendatang di Desa: `Numpang KK warga desa`
  - Data Tono: nama, NIK, tempat/tanggal lahir, jenis kelamin, agama, pekerjaan, alamat di desa
  - Data kepala keluarga yang ditumpangi: nama, NIK, No. KK, **Hubungan Pendatang dengan Kepala Keluarga** (*Famili Lain*), pekerjaan, alamat
- **Formulir yang terbit:** Formulir Pendaftaran Peristiwa Kependudukan dan **Surat Pernyataan Tidak Keberatan Numpang KK**.
- **Dibawa ke Disdukcapil:**
  - Formulir-formulir di atas, ditandatangani di atas materai dan diketahui Ketua RT dan RW (pada unduhan TTD digital, TTD Ketua RT/RW wilayah alamat Tono sudah tertempel)
  - SKPWNI dari Bandung
  - KTP-el dan KK lama Tono
  - KK asli Bu Sri
- **Unggah hasil:** KK Bu Sri yang sudah memuat Tono. Setelah Terapkan, Tono tercatat sebagai warga desa berstatus **Pendatang** di KK Bu Sri.

**Skenario B: pendatang menempati rumah sendiri (KK baru)**

Pasangan muda Yoga membeli rumah di desa dan pindah dari Ciamis. Pemohonnya kerabat mereka yang sudah menjadi warga desa.

- Tempat Tinggal Pendatang: `Rumah milik sendiri/orang tua (membuat KK baru)`. Muncul isian biodata tambahan: golongan darah, pendidikan, no. akta lahir, status perkawinan (bila *Kawin*: no. buku nikah dan tanggal), gelar, kelainan fisik, serta nama dan NIK ibu dan ayah.
- Formulir tambahan yang terbit: **Surat Pernyataan Menggunakan Alamat Rumah Milik Sendiri** dan **Formulir Biodata Keluarga**.
- Setelah Terapkan, Kasi membuat KK baru di data desa dengan Yoga sebagai kepala keluarga dan mengisi No. KK sesuai KK terbitan Disdukcapil.

**Skenario C: pendatang mengontrak**

Bu Maya mengontrak rumah milik Pak Udin.

- Tempat Tinggal Pendatang: `Rumah orang lain/kontrakan/kantor (membuat KK baru)`. Isi jenis tempat (*Kontrakan*) dan data pemilik rumah.
- Formulir tambahan yang terbit: **Surat Pernyataan Alamat Digunakan dalam Administrasi Kependudukan**.

### 6.5 Pelaporan Kelahiran

**Kasus: anak kedua keluarga Bambang**

Lihat kasus lengkapnya di [Kasus Gabungan 7.1](#71-kelahiran-anak-keluarga-bambang). Variasi yang mungkin terjadi:

| Situasi | Pilihan di form | Formulir tambahan yang terbit |
|---|---|---|
| Ada surat keterangan lahir dari RS/puskesmas/bidan | *Ada surat keterangan lahir?* → `Ada` | Tidak ada (selalu terbit: Pelaporan Pencatatan Sipil, Pendaftaran Peristiwa Kependudukan, dan Biodata Keluarga dengan anak) |
| Lahir di rumah dengan paraji/dukun, tanpa surat lahir | → `Tidak ada`, lalu isi nama, NIK, pekerjaan, dan alamat penolong kelahiran | **SPTJM Kebenaran Data Kelahiran** (materai + dua saksi) |
| Orang tua menikah siri (perkawinan belum tercatat) | *Perkawinan ayah dan ibu* → `Belum tercatat`; bila ayah di luar KK, isi juga pekerjaan dan alamatnya | **SPTJM Kebenaran sebagai Pasangan Suami Istri** (ibu sebagai penyata, materai + dua saksi). Akta anak memuat nama ayah dan ibu dengan keterangan perkawinannya belum tercatat |
| Ayah tidak tercatat di KK yang sama | Kosongkan pilihan *Ayah (anggota KK)*, lalu ketik nama, NIK, dan tempat/tanggal lahir ayah | Tidak ada |
| Ibu tunggal / anak perempuan di KK orang tuanya yang melahirkan | Pilih ibu dari anggota KK perempuan mana pun | Tidak ada |

### 6.6 Pelaporan Kematian

**Skenario A: yang meninggal bukan kepala keluarga**

Nenek Ijah, anggota KK cucunya, meninggal di RSUD.

- **Pilih di web:** Layanan Kependudukan → **Pelaporan Kematian**.
- **Yang diisi:**
  - Anggota Keluarga yang Meninggal: pilih **Nenek Ijah** dari daftar KK
  - Tanggal dan pukul kematian, sebab (`Sakit biasa/tua`), tempat (`RSUD ...`), yang menerangkan (`Dokter`)
  - Dua saksi
  - Kepala Keluarga Baru: biarkan *Yang meninggal bukan kepala keluarga*
- **Formulir yang terbit:** Formulir Pelaporan Pencatatan Sipil (bagian kematian) dan Formulir Pendaftaran Peristiwa Kependudukan (perubahan KK karena peristiwa penting, agar Nenek Ijah dihapus dari KK).
- **Dibawa ke Disdukcapil:** kedua formulir, surat keterangan kematian dari RS, KK asli, KTP-el almarhum, serta KTP-el pelapor dan dua saksi. Bila meninggal di rumah tanpa surat keterangan kematian, gantinya SPTJM kebenaran data kematian (formulir dari Disdukcapil) yang ditandatangani pelapor dan dua saksi.
- **Unggah hasil:** kutipan akta kematian dan KK terbaru. Setelah Terapkan, data Nenek Ijah dan akunnya dinonaktifkan.

**Skenario B: yang meninggal kepala keluarga**

- Kepala Keluarga Baru: **wajib dipilih**, misalnya istri almarhum. Muncul isian kontak keluarga dan data tambahan anggota. Susunan KK baru tanpa almarhum disusun otomatis.
- Formulir Pendaftaran Peristiwa Kependudukan dicentang KK baru karena penggantian kepala keluarga, dan Formulir Biodata Keluarga (susunan KK baru) ikut terbit.
- **Unggah hasil:** akta kematian dan KK baru. Setelah Terapkan, almarhum dinonaktifkan dan kepala keluarga baru ditetapkan.

### 6.7 Pelaporan Perkawinan/Perceraian

Formulir yang terbit bergantung pada agama dan status pencatatan. Perkawinan/perceraian Islam dicatat KUA/Pengadilan Agama, jadi ke Disdukcapil cukup perubahan KK. Selain Islam, perkawinan/perceraian dicatatkan ke Disdukcapil untuk mendapat akta.

| Kondisi | Formulir yang terbit |
|---|---|
| Islam, sudah punya buku nikah KUA / akta cerai Pengadilan Agama | Surat Pernyataan Perubahan Elemen Data (F-1.06) + Formulir Pendaftaran Peristiwa (F-1.02) |
| Selain Islam, sah secara agama / ada putusan Pengadilan Negeri, akta belum terbit | F-1.06 + F-1.02 + Formulir Pelaporan Pencatatan Sipil (F-2.01) |
| Selain Islam, kutipan akta Disdukcapil sudah terbit | F-1.06 + F-1.02 |
| Belum tercatat (nikah siri/adat, cerai tanpa putusan) | F-1.06 + F-1.02 + SPTJM Belum Tercatat (F-1.05), dan SPTJM Pasangan Suami Istri (F-2.04) bila perlu |

**Skenario A: perkawinan yang sudah tercatat di KUA**

Rizki (warga desa) menikah dengan Mega (warga desa sebelah) di KUA dan sudah memegang buku nikah.

- **Pilih di web:** Layanan Kependudukan → **Pelaporan Perkawinan/Perceraian**.
- **Yang diisi:**
  - Peristiwa yang Dilaporkan: `Perkawinan`
  - Peran pemohon (suami) terisi otomatis dari jenis kelamin akun Rizki
  - Data pasangan lewat NIK
  - Agama Saat Perkawinan: `Islam`. Belum tercatat?: `Tidak, sudah sah/tercatat`
  - Tanggal perkawinan dan no. buku nikah (wajib). Saksi dan data orang tua tidak ditanyakan.
- **Formulir yang terbit:** Surat Pernyataan Perubahan Elemen Data Kependudukan dan Formulir Pendaftaran Peristiwa Kependudukan (perubahan KK karena peristiwa penting).
- **Dibawa ke Disdukcapil:** buku nikah, KK asli, KTP-el suami dan istri.
- **Unggah hasil:** KK terbaru. Setelah Terapkan, status perkawinan pasangan yang warga desa berubah menjadi *Kawin* dan no. buku nikah tersimpan. Pasangan dari luar desa dilewati.

**Skenario A2: perkawinan Kristen yang baru diberkati**

- Agama Saat Perkawinan: `Kristen`. Belum tercatat?: `Tidak`. Kutipan akta sudah terbit?: `Belum, dicatatkan sekarang`.
- Isi tanggal pemberkatan, nama pemuka agama, perkawinan ke-, data orang tua suami dan istri, status pasangan sebelum kawin, dan dua saksi.
- **Formulir tambahan yang terbit:** Formulir Pelaporan Pencatatan Sipil (bagian perkawinan) untuk akta perkawinan.
- **Dibawa:** surat perkawinan dari gereja dan pas foto berdampingan suami-istri.
- **Lanjutan:** untuk membuat KK sendiri, lihat [Kasus Gabungan 7.2](#72-menikah-dan-membentuk-kk-baru-rizki--mega).

**Skenario B: perkawinan secara agama yang belum tercatat**

- Belum tercatat?: `Ya, belum tercatat`. Isi daftar anak dari perkawinan tersebut bila ada.
- Pertanyaan tambahan: *Perlu SPTJM Kebenaran sebagai Pasangan Suami Istri?* Bila `Ya`, isi data pasangan, dan **SPTJM Kebenaran sebagai Pasangan Suami Istri** ikut terbit.
- Formulir tambahan yang terbit: **SPTJM Perkawinan/Perceraian Belum Tercatat** (materai).

**Skenario C: perceraian dengan putusan pengadilan**

Bu Tati bercerai lewat Pengadilan Agama.

- Peristiwa: `Perceraian`. Agama: `Islam`. Belum tercatat?: `Tidak`. Isi nama pengadilan, tanggal putusan, dan no. akta cerai dari Pengadilan Agama.
- **Formulir yang terbit:** F-1.06 dan F-1.02 (tanpa F-2.01; perceraian Islam dicatat Pengadilan Agama).
- **Dibawa ke Disdukcapil:** akta cerai, KK asli, KTP-el.
- Setelah Terapkan, status perkawinan menjadi *Cerai Hidup* dan no. akta cerai tersimpan.
- Bila perceraian **selain Islam** lewat Pengadilan Negeri dan akta perceraian belum terbit, isi juga no. akta perkawinan, nomor putusan, surat keterangan panitera, dan dua saksi: **F-2.01 bagian perceraian** ikut terbit.

### 6.8 Pengakuan Anak

**Kasus: Pak Darma ingin namanya tercantum di akta anaknya**

Pak Darma dan Bu Eni menikah siri. Anak mereka, Kiki, sudah memiliki akta kelahiran, tetapi akta itu hanya mencantumkan nama ibu. Kini Pak Darma ingin mengakui Kiki secara resmi.

- **Pilih di web:** Layanan Kependudukan → **Pengakuan Anak**.
- **Yang diisi:**
  - Anak yang Diakui: pilih **Kiki** dari daftar KK. Pilihan terbatas pada anak, cucu, atau famili lain.
  - Nomor akta kelahiran anak, tanggal akta, dan Disdukcapil penerbitnya
  - Ibu Kandung Anak: pilih **Bu Eni**
  - Tanggal perkawinan secara agama
  - *Apakah Anda Ayah Biologis Anak Ini?*: `Ya`, karena pemohonnya Pak Darma. Bila pemohonnya Bu Eni, pertanyaan ini otomatis `Tidak`, dan ia mengisi NIK serta data ayah biologis.
  - Ada penetapan pengadilan?: `Ya` atau `Tidak`
  - Dua saksi
- **Formulir yang terbit:** Formulir Pelaporan Pencatatan Sipil (bagian pengakuan anak) dan **Surat Pernyataan Pengakuan Anak**, ditandatangani ayah di atas materai dan disetujui ibu.
- **Unggah hasil:** akta kelahiran yang memuat nama ayah dan KK terbaru. Setelah Terapkan, nama ayah Kiki di data desa terisi dan tertaut ke data Pak Darma.

### 6.9 Perubahan Susunan KK

**Skenario A: pasangan baru membentuk KK sendiri**

Lihat [Kasus Gabungan 7.2](#72-menikah-dan-membentuk-kk-baru-rizki--mega).

**Skenario B: pisah KK**

Doni (30 tahun, belum menikah) sudah punya rumah sendiri di desa dan ingin keluar dari KK orang tuanya.

- Jenis Perubahan: `Membentuk KK baru (keluarga baru / pisah KK)`. Alasan: `Pisah KK`.
- Anggota yang Masuk KK Baru: Doni, dengan hubungan *Kepala Keluarga*. Isi alamat KK baru.

**Skenario C: ganti kepala keluarga**

Pak Usman sudah sepuh dan ingin anaknya, Hendra, menjadi kepala keluarga.

- Jenis Perubahan: `Ganti kepala keluarga`. Kepala Keluarga Pengganti: **Hendra**. Hubungan kepala keluarga lama setelah diganti: *Orang Tua*.

**Skenario D: numpang ke KK lain di desa**

Ratna, janda, ikut tinggal bersama kakaknya, Pak Budi, di desa yang sama.

- Jenis Perubahan: `Masuk/numpang ke KK lain di desa`. Isi anggota yang pindah KK beserta hubungannya di KK tujuan, dan No. KK tujuan.
- **Kepala KK tujuan (Pak Budi) diminta persetujuannya** lewat SIDUTama.
- Formulir tambahan yang terbit: **Surat Pernyataan Tidak Keberatan Numpang KK**.

Untuk semua skenario, setelah hasil diterima, Kasi menekan Terapkan: KK baru dibuat (No. KK diisi Kasi), kepala keluarga diganti, atau anggota dipindah ke KK tujuan sesuai pengajuan.

### 6.10 Pelaporan Pengangkatan Anak

**Kasus: Pak Firman dan Bu Lilis mengangkat anak**

Pasangan Firman dan Lilis mengangkat Bayu, keponakan yatim piatu dari desa lain. Pengadilan Agama sudah mengeluarkan **penetapan pengangkatan anak**.

> Bila penetapan pengadilan **belum ada**, warga harus mengajukan permohonan pengangkatan anak ke pengadilan terlebih dahulu. Layanan ini hanya untuk pelaporan setelah penetapan.

- **Pilih di web:** Layanan Kependudukan → **Pelaporan Pengangkatan Anak**.
- **Yang diisi:**
  - NIK Anak Angkat: bila Bayu warga desa ini, datanya terisi otomatis dari data penduduk. Karena Bayu dari desa lain, data diketik: nama, jenis kelamin, tempat/tanggal lahir, nama dan NIK ibu serta ayah kandung, no. akta kelahiran.
  - Hubungan Anak dalam KK Anda: `Anak`
  - Peran pemohon (Ayah Angkat) terisi otomatis, lalu isi data pasangan sebagai Ibu Angkat
  - Nomor, tanggal, dan nama pengadilan penetapan
  - Dua saksi, serta kontak dan data tambahan anggota KK
- **Formulir yang terbit:** Formulir Pelaporan Pencatatan Sipil (bagian pengangkatan anak), Formulir Pendaftaran Peristiwa Kependudukan, dan Formulir Biodata Keluarga (susunan KK sudah memuat Bayu).
- **Unggah hasil:** KK baru orang tua angkat (dan akta dengan catatan pengangkatan bila sudah terbit). Setelah Terapkan:
  - Bayu, yang belum terdata, ditambahkan sebagai warga baru di KK Firman.
  - Bila Bayu sebelumnya warga desa ini, ia dipindah dari KK asalnya dan kepala KK asal mendapat pemberitahuan.

---

## 7. Studi Kasus Gabungan (Satu Kejadian, Beberapa Surat)

Bagian ini menunjukkan bagaimana satu kejadian hidup dapat memerlukan lebih dari satu pengajuan, dan bagaimana urutannya.

### 7.1 Kelahiran Anak: Keluarga Bambang

**Situasi:** Bambang (kepala keluarga) dan istrinya, Ratih, tercatat dalam satu KK bersama anak pertama mereka. Ratih melahirkan anak kedua, **Aditya**, di Puskesmas dan mendapat surat keterangan lahir dari bidan. Bambang butuh:

1. Bukti kelahiran untuk tunjangan anak di kantornya, **segera**;
2. **Akta kelahiran** Aditya dan **KK baru** yang memuat Aditya.

**Pengajuan di web:**

| Urutan | Kategori | Pilih kartu | Untuk apa |
|---|---|---|---|
| 1 | Persuratan Desa | **Surat Keterangan Kelahiran** | Bukti ke kantor (opsional, hanya bila diminta) |
| 2 | Layanan Kependudukan | **Pelaporan Kelahiran** | Akta kelahiran dan KK baru dari Disdukcapil |

**Pengajuan 1: Surat Keterangan Kelahiran**

- Data pemohon (Bambang) terisi dari akun. Isi data pasangan (Ratih) dan data anak (Aditya). NIK Aditya dikosongkan karena belum terbit.
- RT → Kepala Desa menyetujui, dan surat bernomor dengan TTD Kepala Desa terbit.
- Bambang mengunduh PDF dan menyerahkannya ke bagian SDM kantor.

**Pengajuan 2: Pelaporan Kelahiran**

1. **Pilih:** Layanan Kependudukan → **Pelaporan Kelahiran**. Bambang membaca kotak *Dokumen yang dibawa ke Disdukcapil*.
2. **Isi form:**
   - Data anak: Nama `Aditya Pratama`, jenis kelamin, tempat dilahirkan `Puskesmas`, tempat kelahiran `Pangandaran`, tanggal dan pukul lahir, jenis kelahiran `Tunggal`, kelahiran ke-`2`, penolong `Bidan/Perawat`, berat `3,2` kg, panjang `49` cm
   - Ibu (anggota KK): pilih **Ratih**
   - Ayah (anggota KK): pilih **Bambang**
   - Saksi I dan II: NIK dua tetangga, misalnya Pak Ujang dan Bu Neni
   - Ada surat keterangan lahir?: `Ada`
   - Perkawinan ayah dan ibu: `Tercatat` (buku nikah ikut dilampirkan)
   - Siapa yang mengurus?: `Saya sendiri`
3. **Saksi menyetujui:** Bu Neni membuka **Permintaan Tanda Tangan & Saksi** di akunnya dan menyetujui. Saksi lainnya, yang tidak punya akun, diverifikasi RT.
4. **Persetujuan:** RT → Kepala Desa. Terbit tiga formulir:
   - **Pelaporan Pencatatan Sipil (F-2.01)** bagian kelahiran, untuk akta kelahiran;
   - **Pendaftaran Peristiwa Kependudukan (F-1.02)** dicentang "Perubahan KK: Peristiwa Penting", untuk KK baru;
   - **Biodata Keluarga (F-1.01)**: susunan KK Bambang dengan Aditya di baris terakhir (SHDK Anak, ayah Bambang, ibu Ratih).
5. **Ke Disdukcapil:** Bambang mencetak formulir, lalu membawanya bersama:
   - surat keterangan lahir dari bidan,
   - KK asli,
   - KTP-el Bambang dan Ratih,
   - buku nikah,
   - KTP-el kedua saksi.
6. **Disdukcapil** menerbitkan kutipan akta kelahiran Aditya dan KK baru yang memuat Aditya.
7. **Kembali ke web:** Bambang membuka pengajuan Pelaporan Kelahiran yang sama → **Unggah hasil** → unggah foto/scan akta dan KK baru.
8. **Kasi Pemerintahan** menerima unggahan, lalu menekan **Terapkan**. Aditya tercatat di data penduduk desa dalam KK Bambang, dengan NIK dari KK baru.

> **Variasi:** bila Ratih melahirkan di rumah dengan paraji tanpa surat lahir, Bambang memilih *Ada surat keterangan lahir?* → `Tidak ada`. **SPTJM Kebenaran Data Kelahiran** ikut terbit dan wajib ditandatangani di atas materai bersama dua saksi.

### 7.2 Menikah dan Membentuk KK Baru: Rizki & Mega

**Situasi:** Rizki (anak dalam KK orang tuanya di desa) menikah di KUA dengan Mega (warga desa ini, di KK orang tuanya sendiri). Mereka ingin status kawin tercatat lalu membuat KK sendiri di rumah baru di desa.

| Urutan | Kategori | Pilih kartu | Hasil dari Disdukcapil |
|---|---|---|---|
| 1 | Layanan Kependudukan | **Pelaporan Perkawinan/Perceraian** | Status kawin tercatat, KK terbaru |
| 2 | Layanan Kependudukan | **Perubahan Susunan KK** | KK baru atas nama Rizki |

**Pengajuan 1: Pelaporan Perkawinan/Perceraian**

- Peristiwa `Perkawinan`, agama `Islam`, sudah tercatat, isi no. buku nikah dan data Mega lewat NIK. Terbit F-1.06 dan F-1.02 (tanpa F-2.01 dan saksi).
- Formulir dibawa ke Disdukcapil bersama buku nikah, KK asli, dan KTP-el suami/istri.
- Hasil diunggah. Setelah Terapkan, status Rizki dan Mega di data desa menjadi *Kawin*.

**Pengajuan 2: Perubahan Susunan KK**

- Jenis Perubahan: `Membentuk KK baru`. Alasan: `Membentuk keluarga baru (mis. setelah menikah)`.
- Anggota KK Anda yang masuk KK baru: **Rizki** sebagai *Kepala Keluarga*.
- NIK Pasangan dari KK Lain: NIK **Mega**, dengan hubungan *Istri*. **Mega diminta persetujuannya** lewat SIDUTama.
- Perkawinan sudah tercatat?: `Sudah tercatat`, lalu no. buku nikah dan tanggal perkawinan.
  > Bila Rizki dan Mega menikah siri (belum punya buku nikah), pilih `Belum tercatat`: no. buku nikah tidak ditanyakan, tanggal perkawinan tetap diisi, lalu isi nama/NIK suami dan istri, dua saksi, dan anak bila ada. **SPTJM Perkawinan Belum Tercatat** ikut terbit (materai + dua saksi), dan status keduanya di KK menjadi *Kawin Belum Tercatat*. Pelaporan Perkawinan tidak perlu diajukan lebih dulu.
- Alamat KK baru di desa.
- Formulir Pendaftaran Peristiwa Kependudukan dan Formulir Biodata Keluarga terbit, lalu dibawa ke Disdukcapil bersama KK lama dan buku nikah.
- Hasil (KK baru) diunggah. Setelah Terapkan, KK baru dibuat di data desa, dan Rizki serta Mega pindah ke KK tersebut.

> **Bila Mega berasal dari luar desa:** Mega lebih dulu masuk lewat **Pindah Datang**, atau Rizki memasukkan Mega dalam pengajuan Pindah Datang dengan tempat tinggal *Rumah milik sendiri (membuat KK baru)*.

### 7.3 Kematian Anggota Keluarga: Pak Karta

**Situasi:** Pak Karta, **kepala keluarga**, wafat. Anaknya, Herman, perlu mengurus santunan, akta kematian, KK baru untuk ibunya, dan pencairan tabungan almarhum.

| Urutan | Kategori | Pilih kartu | Untuk apa |
|---|---|---|---|
| 1 | Persuratan Desa | **Surat Keterangan Penguburan** | Klaim santunan kematian |
| 2 | Layanan Kependudukan | **Pelaporan Kematian** | Akta kematian dan KK baru (ibu sebagai kepala keluarga) |
| 3 | Layanan Kependudukan | **Surat Keterangan Ahli Waris** | Pencairan tabungan di bank |

**Urutan yang disarankan:** ajukan **Pelaporan Kematian** lebih dulu atau bersamaan dengan Surat Keterangan Penguburan.

- Di **Pelaporan Kematian**, pilih Pak Karta dari daftar KK, lalu **Kepala Keluarga Baru** = ibu Herman (Bu Imas). Formulir Pendaftaran Peristiwa Kependudukan dan Formulir Biodata Keluarga ikut terbit.
- Hasil (akta kematian dan KK baru) diunggah. Setelah Terapkan, Pak Karta dinonaktifkan dan Bu Imas menjadi kepala keluarga.
- Surat Keterangan Penguburan dan Surat Keterangan Ahli Waris diajukan Herman sebagai pemohon dengan mengisi NIK almarhum; data Pak Karta diambil dari data penduduk walaupun sudah dinonaktifkan. Keduanya terbit dengan nomor dan TTD Kepala Desa.

### 7.4 Pindah Datang lalu Butuh Surat Desa: Fajar

**Situasi:** Fajar pindah dari Garut untuk bekerja di pabrik dekat desa dan menumpang di KK pamannya, Pak Asep.

| Urutan | Kategori | Pilih kartu | Siapa pemohon |
|---|---|---|---|
| 1 | Layanan Kependudukan | **Pindah Datang** (numpang KK) | Pak Asep, sebagai perantara |
| 2 | Persuratan Desa | **Surat Keterangan Domisili** | Fajar (setelah terdata dan punya akun) |
| 3 | Persuratan Desa | **Surat Keterangan Penghasilan** | Fajar, untuk pengajuan kredit motor |

Setelah Pindah Datang selesai dan diterapkan, Fajar tercatat sebagai warga berstatus pendatang di KK Pak Asep. Ia kemudian dapat membuat akun sendiri dan mengajukan surat-surat desa atas namanya.

### 7.5 Mengajukan KPR: Andi & Sinta

**Situasi:** Andi (belum menikah) ingin mengambil KPR subsidi. Bank meminta tiga keterangan dari desa.

| Kategori | Pilih kartu | Isian utama |
|---|---|---|
| Persuratan Desa | **Surat Keterangan & Pertama Kali Memiliki Rumah** | Rata-rata penghasilan per bulan |
| Persuratan Desa | **Surat Keterangan Penghasilan** | Bidang usaha/mata pencaharian, penghasilan per bulan |
| Persuratan Desa | **Surat Keterangan Belum Menikah** | Tidak ada isian tambahan |

Ketiganya diajukan terpisah dan bisa dikirim di hari yang sama. Masing-masing berlaku 90 hari, jadi sebaiknya diajukan saat berkas KPR sudah siap diserahkan.

### 7.6 Anak dari Pernikahan Siri: Keluarga Darma

**Situasi:** Pak Darma dan Bu Eni menikah siri. Anak mereka lahir dan perlu akta. Kemudian mereka mencatatkan perkawinannya.

| Urutan | Kategori | Pilih kartu | Catatan |
|---|---|---|---|
| 1 | Layanan Kependudukan | **Pelaporan Kelahiran** | *Perkawinan ayah dan ibu* → `Belum tercatat`, sehingga SPTJM Kebenaran sebagai Pasangan Suami Istri ikut terbit |
| 2 | Layanan Kependudukan | **Pelaporan Perkawinan/Perceraian** | Belum tercatat → `Ya`. SPTJM Perkawinan Belum Tercatat (dan SPTJM Pasangan Suami Istri bila perlu) ikut terbit |

> Bila akta anak **sudah terbit** tanpa nama ayah, gunakan kartu **Pengakuan Anak** (lihat [6.8](#68-pengakuan-anak)).

### 7.7 Data Lama Tidak Sesuai: Keluarga Hasan

**Situasi:** Sebelum mengurus berkas kerja anaknya, Pak Hasan sadar KK-nya sudah usang: pendidikan dan pekerjaan anak belum diperbarui, dan nama istrinya berbeda di beberapa dokumen.

| Kategori | Pilih kartu | Untuk apa |
|---|---|---|
| Layanan Kependudukan | **Perubahan Elemen Data Kependudukan** | Memperbarui pendidikan/pekerjaan di KK |
| Persuratan Desa | **Surat Keterangan Beda Nama** | Menjelaskan perbedaan nama istri di beberapa dokumen |

---

## 8. Situasi Khusus yang Berlaku di Semua Surat

| Situasi | Yang terjadi di web |
|---|---|
| **Surat ditolak RT/Kepala Desa** | Status *Ditolak* beserta alasannya. Warga memperbaiki data lalu mengajukan ulang. |
| **Saksi atau pihak lain menolak permintaan** | Surat tidak dapat diproses tanpa persetujuan tersebut. Pemohon dapat mengganti saksi. Penerima permintaan juga dapat memblokir pemohon yang mengirim permintaan berulang. |
| **Permintaan saksi tidak dijawab** | Permintaan punya masa berlaku. Setelah kedaluwarsa, pemohon dapat mengganti saksi. |
| **Hasil Disdukcapil yang diunggah ditolak Kasi** | Muncul pesan *Unggahan terakhir ditolak desa*. Warga cukup **Unggah ulang** berkas yang benar, tanpa mengajukan ulang. |
| **Formulir diurus orang lain** | Pada pertanyaan *Siapa yang Akan Mengurus Formulir Ini ke Disdukcapil?*, pilih *Diwakilkan*, lalu isi NIK penerima kuasa. Surat Kuasa ikut terbit (khusus Layanan Kependudukan). |
| **Surat desa melewati masa berlaku** | Surat tetap tampil sebagai riwayat, tetapi pemohon tidak bisa lagi mengunduh atau melihat PDF-nya. Ajukan surat baru dengan jenis yang sama. Masa berlaku tercantum di kartu: Usaha 365 hari, Tidak Mampu 180 hari, sebagian besar lainnya 90 hari, Ahli Waris tanpa batas. |
| **Kepala Desa berhalangan** | Sekretaris Desa menyetujui pada tahap yang sama, sehingga warga tidak perlu menunggu. |
| **Pemohonnya pejabat desa** | Pejabat (termasuk Staf SIDUTama) mengajukan surat pribadi lewat **Surat Saya** dan tidak dapat menyetujui suratnya sendiri. Ketua RT yang mengajukan untuk dirinya sendiri langsung masuk ke tahap Kepala Desa. Surat dari Kepala Desa atau Sekretaris Desa melewati tahap RT dan disetujui oleh pasangannya (Sekdes untuk surat Kades, dan sebaliknya). |
| **Jabatan penyetuju kosong** | Bila RT wilayah pemohon belum terisi, atau Kepala Desa dan Sekretaris Desa sama-sama tidak dapat menyetujui, surat **ditahan** di tahap itu (tidak ditolak) dan Staf SIDUTama diberi tahu. Begitu jabatannya terisi, pejabat baru langsung dapat memprosesnya. |
| **Pemohon pindah RT setelah mengajukan** | Wilayah surat dicatat saat pengajuan, jadi surat tetap diproses RT, RW, dan Kepala Dusun wilayah lama. |
| **Pendatang/orang yang belum terdata** | Diajukan oleh warga desa sebagai perantara (Pindah Datang, Surat Pernyataan Tidak Memiliki Dokumen Kependudukan, Pindah Keluar untuk WNA). |
