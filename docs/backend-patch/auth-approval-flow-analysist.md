> **Catatan Batch 14:** Dokumen ini bersifat historis. Jika uraian implementasi berbeda dari source backend final, ikuti source dan `docs-sync-report.md` Bagian 3.

# Laporan Analisis: Perombakan Akun, Jabatan, dan Alur Persetujuan Surat

**Proyek:** SIDUTama Cibenda (Sistem Informasi Desa)
**Cakupan:** Autentikasi (login/register), manajemen jabatan (promote/demote), alur persetujuan surat, peran Kasi/Kaur
**Basis analisis:** Source code backend (`backend.zip`), TDD v5.0 (Bagian 1–5 + Appendix), OpenAPI v5.0, SID-ARCH-SYS/BE/FE, Class Diagram v5
**Status:** Semua keputusan bisnis utama sudah disepakati. Beberapa asumsi teknis menunggu persetujuan (Bagian 9).
**Revisi 2:** Registrasi disederhanakan menjadi **NIK + password saja**. Username dibuat otomatis (`namadepan.1234`), ditampilkan setelah register, dan dapat diganti di profil. Faktor kedua tanggal lahir **tidak dipakai** (risiko diterima, lihat Bagian 6).

---

## 1. Ringkasan Eksekutif

Hasil pembacaan kode menunjukkan **kode saat ini tidak sepenuhnya sesuai dokumen**, dan **sebagian cara kerja akun/jabatan yang ada punya celah keamanan dan akuntabilitas**. Setelah beberapa putaran analisis, disepakati perubahan berikut:

1. **Satu orang, satu akun.** Pejabat dan petugas desa adalah *warga yang dipromosikan*, bukan akun terpisah.
2. **Login memakai username + password.** Warga mendaftar sendiri hanya dengan **NIK + password**; username dibuat otomatis dari nama depan + angka acak (contoh `aminah.2518`), ditampilkan setelah pendaftaran, dan dapat diganti di profil. Email menjadi opsional dan diisi di profil.
3. **Petugas Desa pertama dibuat lewat perintah developer (CLI).** Selanjutnya petugas mempromosikan warga menjadi pejabat atau petugas lain. Petugas tidak boleh menurunkan dirinya sendiri, dan jumlah petugas tidak boleh nol.
4. **Role mengikuti jabatan.** Saat dipromosikan, akun naik ke role jabatan. Saat jabatan berakhir, akun kembali menjadi warga.
5. **Alur surat disederhanakan menjadi 2 tahap: RT → Kepala Desa/Sekretaris Desa (final).** Kasi/Kaur tidak lagi memberi persetujuan. Mereka menerima notifikasi dan bisa mengunduh/mencetak surat yang sudah disetujui.
6. **Pejabat boleh mengajukan surat untuk dirinya sendiri.** Tahap yang dijabat pemohon dilewati, kecuali tahap final, dan tidak ada pejabat yang boleh menyetujui suratnya sendiri.

**Dampak:** perubahan menyentuh hampir semua lapisan backend (migrasi, model, seeder, factory, repository, service, controller, kebijakan akses, rute, dan ±45 file test), serta kontrak API untuk frontend dan beberapa dokumen. Pekerjaan dipecah menjadi **14 batch** yang bisa dieksekusi bertahap oleh AI/developer dengan verifikasi di tiap batch.

---

## 2. Latar Belakang

Dokumen TDD mendefinisikan akun pejabat dibuat langsung oleh Petugas Desa (lengkap dengan password), login memakai email, dan Kasi/Kaur sebagai pemberi persetujuan akhir. Saat diperiksa terhadap kode, ditemukan ketidaksesuaian dan masalah praktis, sehingga diputuskan menyelaraskan sekaligus memperbaiki desain.

---

## 3. Temuan pada Kondisi Saat Ini

### 3.1 Masalah yang memengaruhi fungsi

| # | Temuan | Dampak |
|---|---|---|
| 1 | Login memakai `username`, tetapi **tidak ada logic yang mengisi username** pada register maupun pembuatan akun pejabat | Akun hasil register dan hasil pembuatan pejabat **tidak bisa login**. Hanya akun dari seeder yang bisa masuk |
| 2 | Akun dengan status nonaktif **tetap bisa login** | Bertentangan dengan UC-01 |
| 3 | Rute autentikasi terdaftar **dua kali** (web dan api), dan rute logout di salah satunya menunjuk method yang tidak ada | Perilaku rute ambigu, rawan error |
| 4 | Nomor surat dibentuk dari ID surat bertipe **UUID** dengan format angka | Nomor tidak berurutan dan berpotensi **bentrok** (kolom nomor surat wajib unik) |
| 5 | Endpoint ubah status aktif akun **tidak memeriksa aturan** (boleh menonaktifkan diri sendiri / petugas terakhir) | Risiko desa kehilangan seluruh petugas |
| 6 | Pemetaan role↔jabatan hanya menangani Sekretaris Desa | Jabatan lain bisa tidak sinkron antara tabel akun dan tabel jabatan |

### 3.2 Masalah keamanan dan akuntabilitas

| # | Temuan | Dampak |
|---|---|---|
| 7 | Petugas **mengisi password** akun pejabat | Petugas mengetahui password pejabat |
| 8 | Rotasi jabatan membutuhkan akun baru dan **meninggalkan akun lama yatim** | Akun lama masih punya role pejabat |
| 9 | Password memakai **bcrypt**, dokumen keamanan mewajibkan **Argon2id** | Tidak sesuai standar yang ditetapkan |
| 10 | Dokumen mewajibkan `spatie/laravel-activitylog`, tetapi **paket tidak terpasang** | Tidak ada jejak audit untuk perubahan jabatan |
| 11 | Verifikasi pendaftaran hanya dengan NIK | NIK mudah diketahui orang lain, sehingga rawan pendaftaran atas nama orang lain. **Keputusan akhir: tetap NIK saja, risiko diterima** (lihat Bagian 6) |

### 3.3 Ketidaksesuaian dokumen dan kode

Dokumen menulis login dengan **email**, kode memakai **username**. Dokumen mencantumkan Kasi/Kaur sebagai approver final, kebijakan baru menjadikannya penerima notifikasi. Dokumen menyatakan **kode/migration adalah sumber kebenaran tertinggi**, sehingga dokumen perlu disesuaikan setelah patch.

---

## 4. Keputusan yang Telah Disepakati

### 4.1 Akun dan autentikasi

| Aspek | Keputusan |
|---|---|
| Identitas | Satu orang = satu akun. Pejabat/petugas = warga yang dipromosikan |
| Login | `username` + `password`; akun nonaktif ditolak dengan pesan jelas |
| Register | Hanya **NIK + password** (+ konfirmasi). Nama diambil dari data kependudukan. **Username dibuat otomatis** |
| Email | Opsional, diisi dan diubah di profil. Lupa password lewat email hanya untuk yang mengisi email, selain itu **reset oleh petugas** |
| Username | Format `namadepan.NNNN` (kata pertama nama tanpa gelar, huruf kecil + titik + 4 angka acak). Contoh: `aminah.2518`, `supratman.1274`. Nama depan sama dibedakan angka acak; sistem mengecek keunikan dan mengulang pengacakan bila bentrok. Username ditampilkan sekali setelah register |
| Mengganti username | Warga boleh mengganti username di profil (huruf kecil/angka/titik/garis bawah, 4–30 karakter, unik) |
| Lupa username | Petugas dapat melihat username warga di daftar akun dan membantu warga yang lupa |
| Keamanan | Rate limit pendaftaran dan login; password Argon2id |

### 4.2 Petugas Desa dan jabatan

| Aspek | Keputusan |
|---|---|
| Petugas pertama | Akun warga yang sudah terdaftar dipromosikan satu kali lewat CLI; identitas citizen, akun, username, dan password yang sama dipertahankan |
| Petugas berikutnya | Dipromosikan oleh petugas |
| Menurunkan petugas | Hanya oleh **petugas lain**. Tidak boleh diri sendiri. Petugas terakhir tidak boleh turun |
| Pesan penolakan | "Aksi gagal karena Anda adalah petugas tersisa. Petugas desa tidak boleh kosong." |
| Pejabat lain (RT, RW, Kadus, Kades, Sekdes, Kasi, Kaur) | Dipromosikan/diturunkan oleh petugas. Role naik/turun otomatis dalam satu transaksi |
| Jabatan dengan surat tertunda saat diturunkan | **Peringatan saja**, penurunan tetap berjalan |
| Masa jabatan | Kolom tanggal berakhir bersifat informasi; penurunan **manual**; dashboard petugas menampilkan pengingat "jabatan lewat masa" tanpa scheduler |
| Audit | Semua promote/demote tercatat di log aktivitas |

### 4.3 Alur surat

| Aspek | Keputusan |
|---|---|
| Alur standar | **RT → Kepala Desa/Sekretaris Desa (final)** |
| Persetujuan final dan nomor surat | Di Kepala Desa atau Sekretaris Desa (siapa lebih dulu menang) |
| Tanda tangan di surat | **Selalu milik Kepala Desa**, siapa pun yang menyetujui |
| Jejak/log | Mencatat **aktor yang sebenarnya** menyetujui (Kades atau Sekdes) |
| Notifikasi RW | Hanya setelah RT menyetujui |
| Kasi/Kaur | Bukan approver. Hanya notifikasi saat surat final disetujui + tombol unduh/cetak |
| Unduh surat | Aktif untuk warga pemohon dan Kasi/Kaur yang bersangkutan setelah final |
| Pemohon pejabat | Boleh mengajukan. Hanya **tahap milik sendiri** dilewati; **tahap final tidak pernah dilewati**; tidak boleh menyetujui surat sendiri |
| Pemohon Kades/Sekdes | Kades → disetujui Sekdes; Sekdes → disetujui Kades (jabatan dipilih serentak sehingga selalu terisi) |
| Pemohon RW, Kadus, Petugas, Kasi, Kaur | Tidak ada tahap yang dilewati |

### 4.4 Diagram alur surat (ringkas)

```
Warga biasa ──► RT ──► Kades ATAU Sekdes (FINAL: setuju + nomor surat) ──► Notifikasi Warga + Kasi/Kaur
                 │
                 └─► (setelah RT setuju) Notifikasi FYI ke RW

RT mengajukan ──► [tahap RT dilewati] ──► Kades ATAU Sekdes (FINAL)
Kades mengajukan ──► RT ──► Sekdes (Kades tidak boleh menyetujui suratnya sendiri)
Sekdes mengajukan ──► RT ──► Kades
```

---

## 5. Perbandingan Tiga Sumber

| Aspek | Dokumen (TDD/OpenAPI) | Kode saat ini | Keputusan akhir |
|---|---|---|---|
| Login | Email | Username | **Username** |
| Register | NIK, nama, email, password | NIK, nama, email, password | **NIK + password** (username otomatis) |
| Pembuatan pejabat | Petugas buat akun + password | Sama | **Promote akun warga** |
| Rotasi | Butuh akun baru | Sama | **Akun lama turun jadi warga, akun baru naik** |
| Petugas pertama | Tidak jelas | Seeder dengan password tetap | **Promosi CLI dari akun warga yang sudah terdaftar; tanpa membuat citizen/user/password baru** |
| Alur surat | RT → Kades → Kasi | Sama | **RT → Kades/Sekdes (final)** |
| Kasi/Kaur | Approver final | Approver final | **Penerima notifikasi + unduh** |
| Hash password | Argon2id | Bcrypt | **Argon2id** |
| Audit jabatan | Activity log | Tidak ada | **Activity log dipasang** |
| Akun nonaktif login | Ditolak | Lolos | **Ditolak** |

**Alasan model "satu akun dipromosikan" lebih baik daripada "akun per jabatan":** pada model akun-per-jabatan, riwayat persetujuan menunjuk ke akun jabatan sehingga nama pemberi persetujuan berubah mengikuti pemegang baru, password harus diserahterimakan, dan sulit dibuktikan siapa yang menyetujui. Model promote menjaga **satu orang tetap satu identitas** sehingga jejak audit utuh.

---

## 6. Risiko dan Mitigasi

| Risiko | Tingkat | Mitigasi |
|---|---|---|
| Pendaftaran atas nama orang lain (verifikasi hanya NIK) | Sedang–Tinggi | **Risiko diterima oleh keputusan bisnis.** Mitigasi: rate limit per IP dan per NIK; akun baru hanya berole warga (tanpa wewenang) sampai dipromosikan; petugas dapat mereset password dan menonaktifkan akun non-petugas; **SOP: petugas memverifikasi identitas pemilik akun secara tatap muka sebelum mempromosikannya menjadi pejabat**. Disarankan ditinjau ulang sebelum produksi |
| Petugas saling menurunkan / saling mengambil alih | Sedang | Tidak boleh diri sendiri, petugas terakhir terlindungi, semua aksi tercatat; reset password petugas lain hanya lewat CLI |
| Pejabat lewat masa jabatan masih berwenang (tanpa scheduler) | Rendah–Sedang | Pengingat di dashboard petugas; penurunan manual |
| Surat sedang berjalan pada alur lama saat deploy | Rendah | Proyek belum production dan DB dev/staging di-reset, sehingga tidak ada surat berjalan yang perlu dimigrasi. Jika staging ternyata memuat data penting, jalur dialihkan ke migration tambahan + migrasi data |
| Password lama (bcrypt) tidak bisa diverifikasi setelah pindah Argon2id | Sedang | Data dev/staging di-reset; untuk data yang dipertahankan gunakan opsi transisi verifikasi |
| Perubahan kontrak API menimpa frontend | Tinggi | Daftar *breaking change* disiapkan (lihat plan) dan diserahkan ke tim frontend sebelum rilis |
| Paket log aktivitas memakai ID bigint sedangkan akun memakai UUID | Sedang | Kolom pelaku/subjek diubah menjadi teks pada migrasi paket |
| Akun tanpa email tidak bisa memakai lupa-password | Rendah | Reset oleh petugas (password sementara + wajib ganti) |

---

## 7. Dampak Perubahan

### 7.1 Backend (ringkas)

| Lapisan | Perubahan |
|---|---|
| Migrasi | **Mengedit file migration lama** karena belum production (username wajib & email opsional di tabel akun, tanggal berakhir jabatan di tabel jabatan, penanda wajib-ganti-password) + satu tabel baru penghitung nomor surat. Tanpa migrasi data; alur 2 tahap dan pembersihan pengaturan ditangani seeder |
| Model / Enum | Enum jabatan + pemetaan ke role, perbaikan model akun, relasi jabatan aktif |
| Seeder / Factory | Seeder alur, tipe surat, pengaturan, wilayah (username konsisten + Sekretaris Desa), hapus seeder admin lama; factory akun/jabatan diperluas |
| Repository | Metode baru untuk jabatan, akun, surat; penghapusan query lama "Kasi menunggu keputusan" |
| Service | Layanan penugasan jabatan (promote/demote/rotate), layanan alur langkah surat, pembuat nomor surat, perubahan layanan RT/Kades/Kasi/Letter/Dashboard/PDF/Auth/User |
| Controller / Request / Policy / Rute | Endpoint promote/demote, profil, reset password, Kasi hanya-baca, pembatasan kebijakan jabatan ke petugas |
| Perintah konsol | Petugas pertama, penurunan darurat, reset password darurat |
| Test | ±45 file test disesuaikan atau ditulis ulang, ±12 file test baru |

### 7.2 Frontend (di luar zip, perlu koordinasi)

Login memakai `username`; form register hanya NIK + password + konfirmasi dan harus **menampilkan username hasil generate** (respons `201`); profil dapat mengganti `username` dan `email`; endpoint pembuatan akun pejabat diganti promote/demote; Kasi/Kaur tidak lagi memiliki aksi setujui/tolak; kunci dashboard Kasi dan Petugas berubah; ada endpoint profil, ganti password, dan layar "wajib ganti password"; daftar surat milik sendiri (`scope=mine`) untuk pejabat.

### 7.3 Dokumen

TDD-01 (peran, alur), TDD-02 (UC-01, 03, 04c, 04d, 08, 14, 15, 17, 22), TDD-03 (tabel users/officials/letters), TDD-04/05, OpenAPI, Class Diagram. Detail di plan.

---

## 8. Temuan Tambahan di Luar Cakupan (dicatat, tidak dikerjakan)

1. Catatan persetujuan "menunggu" yang dibuat saat pengajuan surat tidak pernah ditutup, sehingga penanda *overdue* bisa terus menyala.
2. Fallback notifikasi ke semua petugas saat pejabat wilayah kosong (UC-03 9a) belum diimplementasikan.
3. Pencarian Kepala Desa untuk tanda tangan belum dibatasi per desa (relevan jika kelak multi-desa).
4. Query statistik surat per RW tampak memakai kolom yang tidak ada di tabel warga (perlu diverifikasi).

---

## 9. Asumsi yang Perlu Persetujuan Ketua

Ini keputusan teknis yang saya ambil sebagai default. Mohon konfirmasi atau koreksi.

| Kode | Asumsi | Alternatif |
|---|---|---|
| A1 | Memasang paket `spatie/laravel-activitylog` untuk audit jabatan (sesuai dokumen keamanan) | Tabel log sendiri |
| A2 | Mengganti nama layanan/controller Kasi menjadi `KasiLetter*` (karena tidak lagi "approval") | Mempertahankan nama lama |
| A3 | Format nomor surat tetap `NNN/KODE/TAHUN`, tetapi **urutan nyata** lewat tabel penghitung (menggantikan nomor berbasis UUID) | Format resmi lain (mis. `470/NNN/KODE/BULAN-ROMAWI/TAHUN`) |
| A4 | Fitur "wajib ganti password" + reset password sementara oleh petugas (hanya untuk akun non-petugas) | Reset manual lewat CLI saja |
| A5 | Kunci dashboard Kasi dan Petugas berubah (perubahan kontrak API) | Mempertahankan kunci lama |
| A6 | Rute autentikasi dipertahankan hanya di jalur web (`/login`, `/register`), duplikat di `/api/*` dihapus | Sebaliknya |
| A7 | Data dev/staging di-reset (`migrate:fresh --seed`) karena perubahan hash password | Migrasi data bertahap |
| A8 | Jika pemohon Kades/Sekdes dan pasangannya tidak aktif, pengajuan **ditolak** dengan pesan jelas | Diproses di luar sistem |
| A9 | Tipe surat tanpa `assigned_role` → notifikasi dan akses unduh untuk **Kasi dan Kaur sekaligus** | Wajib diisi |
| A10 | Kasi/Kaur hanya dapat melihat surat yang **sudah disetujui** dan sesuai tugasnya | Melihat semua surat desa |
| A11 | Petugas tidak bisa mereset password petugas lain lewat API (hanya CLI) | Boleh |
| A12 | Pejabat melihat surat miliknya lewat `GET /letters?scope=mine` | Endpoint terpisah |
| A13 | Sistem tidak lagi mengizinkan mengubah posisi/akun/status aktif jabatan lewat `PATCH /officials`; harus lewat promote/demote/rotate | Tetap boleh |
| A14 | Relasi `User::official()` berubah menjadi jabatan **aktif** saja; riwayat lewat `officials()` | Tetap relasi lama |
| A15 | Username otomatis: kata pertama nama (gelar di awal seperti H., Hj., Dr. dibuang), huruf kecil `a-z0-9`, maksimal 20 karakter, + `.` + 4 angka acak (1000–9999). Bentrok → acak ulang (maks 10×), lalu 5 angka | Format lain |
| A16 | Warga boleh mengganti username di profil (aturan sama, unik) | Username permanen |
| A17 | Respons register `201` memuat username; auto-login tetap | `204` tanpa username |
| A18 | Registrasi tanpa faktor kedua (tanpa tanggal lahir); risiko diterima | Tambah faktor kedua |
| A19 | Karena belum production, **migration lama diedit** (bukan migration tambahan) dan semua DB dev/staging di-reset dengan `migrate:fresh --seed` | Migration tambahan + migrasi data |

---

## 10. Rencana Pelaksanaan (14 Batch)

| Batch | Isi | Risiko |
|---|---|---|
| B0 | Baseline test + cabang kerja | Rendah |
| B1 | Infrastruktur: hashing Argon2id, paket log aktivitas, perapian rute, rate limiter | Sedang |
| B2 | Migrasi (edit migration lama: akun & jabatan; tabel baru penghitung nomor; tanpa migrasi data) | Sedang |
| B3 | Enum dan model | Sedang |
| B4 | Factory dan seeder | Sedang |
| B5 | Repository + test repository | Sedang |
| B6 | Domain autentikasi: login, register, profil, wajib-ganti-password | Tinggi |
| B7 | Domain penugasan jabatan: promote/demote/rotate, akun, perintah konsol | Tinggi |
| B8 | Inti alur surat: layanan langkah, nomor surat, pengajuan oleh pejabat, kebijakan akses | Tinggi |
| B9 | Layanan persetujuan: RT, Kades (final), Kasi hanya-baca, notifikasi | Tinggi |
| B10 | PDF/unduh, dashboard, validasi alur, pengaturan deadline | Sedang |
| B11 | Penyapuan test menyeluruh | Sedang |
| B12 | Sinkronisasi dokumen dan serah terima kontrak API ke frontend | Rendah |
| B13 | Verifikasi akhir dan pembersihan | Rendah |

**Kriteria selesai:** seluruh test hijau pada SQLite (dan PostgreSQL bila tersedia), `migrate:fresh --seed` berhasil, tidak ada referensi sisa ke alur 3 tahap/Kasi sebagai approver, dokumen dan changelog frontend terbit.

Rincian teknis lengkap ada di **auth-approval-flow-plan.md**. Prompt eksekusi per batch ada di **auth-approval-flow-patch-prompt.md**.
> **Catatan Batch 14:** Dokumen ini bersifat historis. Jika uraian implementasi berbeda dari source backend final, ikuti source dan `docs-sync-report.md` Bagian 3.
