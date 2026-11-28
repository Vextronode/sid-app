---
tags:
  - dev
  - laravel
  - react
  - setup
  - sanctum
date: 2026-11-21
---

# Setup Project

Panduan clone dan menjalankan project di lokal. Command ditulis untuk **Windows (PowerShell/CMD)**. macOS/Linux hampir sama, bedanya di cara menyalin file `.env` (`cp`, bukan `copy`).

Untuk menjalankan stack Docker staging/produksi (bukan pengembangan lokal), lihat README bagian **B. Produksi**.

---

## Prasyarat

- PHP 8.3+ dengan extension `pdo_pgsql` aktif (dan `gd` dengan dukungan WebP agar gambar unggahan dioptimasi)
- Composer
- Node.js 20.19+ atau 22.12+ (dibutuhkan Vite 8; image Docker frontend memakai Node 22)
- PostgreSQL (backend memakai `DB_CONNECTION=pgsql`; image Docker memakai PostgreSQL 18)
- Git

Cek extension PostgreSQL:
```powershell
php -m | findstr pgsql
```
Harus muncul `pgsql` dan `pdo_pgsql`. Kalau kosong, aktifkan `extension=pgsql` dan `extension=pdo_pgsql` di `php.ini`, lalu buka ulang terminal.

---

## Struktur Repo

Monorepo dengan 2 aplikasi di `apps/`:
- `apps/backend` - Laravel (API, queue, scheduler)
- `apps/frontend` - React SPA (Vite)

Folder `deploy/` berisi docker compose dan skrip untuk stack staging/produksi.

---

## 1. Clone Repo

```powershell
git clone https://github.com/org/nama-repo.git
cd nama-repo
```

---

## 2. Setup Backend

```powershell
cd apps\backend
composer install
copy .env.example .env
php artisan key:generate
```

> Jangan memakai `composer setup` / `composer dev`. Keduanya bawaan template Laravel dan menjalankan `npm` di folder backend, padahal backend tidak punya `package.json` (`composer dev` juga memakai `--kill-others`, sehingga semua prosesnya ikut berhenti). Jalankan perintah di panduan ini secara manual.

### Buat Database PostgreSQL

```sql
CREATE DATABASE sidutama WITH ENCODING 'UTF8';
```

Jalankan perintah tersebut melalui `psql` atau aplikasi administrasi PostgreSQL yang digunakan tim. Nama database bebas, asal sama dengan `DB_DATABASE`.

### Edit `.env`

`.env.example` adalah template lengkap untuk dev lokal: strukturnya sama dengan `.env` tim, nilai non-rahasia sudah terisi (locale `id`, `SESSION_DRIVER=file`, `QUEUE_CONNECTION=database`, `CACHE_STORE=file`, dst.), dan rahasia dikosongkan. Biasanya cukup isi:

```env
# Port dev Vite (npm run dev) = 5173.
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:5173
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173,localhost:5173

DB_DATABASE=sidutama
DB_USERNAME=postgres
DB_PASSWORD=isi_password_postgresql_anda

# Email lupa kata sandi lewat Mailtrap Sandbox (lihat "Email lupa kata sandi" di bawah).
MAILTRAP_API_KEY=
MAILTRAP_INBOX_ID=
```

> Default `.env.example` menunjuk ke `npm run dev` (port 5173); versi `vite preview` (port 4173) ada di baris yang di-comment. `FRONTEND_URL` dan `SANCTUM_STATEFUL_DOMAINS` harus cocok dengan host + port frontend yang benar-benar dibuka di browser. Kalau beda, login gagal dengan error `419` atau `401 Unauthenticated`.

### Variabel `.env` penting lainnya

| Variabel | Fungsi | Catatan |
|---|---|---|
| `SID_APP_NAME` | Nama aplikasi untuk pengguna: judul login, `<title>`, manifest PWA, dan label peran staf ("Staf {nama}") | Default `SIDUTama`. Samakan dengan `VITE_APP_NAME` |
| `APP_LOCALE`, `APP_FALLBACK_LOCALE`, `APP_FAKER_LOCALE` | Bahasa pesan validasi (`lang/id/validation.php`), pesan bawaan framework (`lang/id.json`, `lang/id/*.php`), email reset kata sandi, dan data palsu factory/seeder | Wajib `id`, `id` dan `id_ID` (sudah begitu di `.env.example`; `phpunit.xml` memaksa `APP_LOCALE` dan `APP_FALLBACK_LOCALE` = `id` untuk test). Nilai `en` membuat pesan validasi kembali berbahasa Inggris. Setelah mengubah, jalankan `php artisan config:clear` |
| `QUEUE_CONNECTION` | Cara mengirim pekerjaan antrean (Web Push, notifikasi peringatan SIGAP, dan sinyal realtime) | `database` = diantrekan, butuh `queue:work`; `sync` = langsung dikirim tanpa worker. Lihat bagian 3 |
| `BROADCAST_CONNECTION` | Realtime (Laravel Reverb): notifikasi, surat, dan peringatan bencana diperbarui tanpa menunggu polling | `reverb` = aktif, butuh `php artisan reverb:start` dan `queue:work`; `log`/`null` = mati, frontend tetap polling. Lihat "Kenapa ada server Reverb?" di bagian 3 |
| `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` | Kredensial app Reverb | Lokal boleh nilai di `.env.example`. Key publik (dikirim ke browser), secret hanya backend |
| `REVERB_HOST`, `REVERB_PORT`, `REVERB_SCHEME` | Alamat server Reverb untuk backend saat mengirim event | Lokal `127.0.0.1`, `8080`, `http` |
| `REVERB_CLIENT_HOST`, `REVERB_CLIENT_PORT`, `REVERB_CLIENT_SCHEME` | Alamat WebSocket untuk browser (dikirim lewat `GET /api/realtime/config`) | Lokal `127.0.0.1`, `8080`, `http`. Kosong = ikut origin halaman (stack Docker) |
| `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Kunci Web Push | Buat dengan `php artisan webpush:vapid`. Kosong = push nonaktif, in-app tetap jalan |
| `SESSION_DRIVER` | Penyimpanan sesi | `file` untuk lokal. Dengan `database`, `staf-sid:recover` juga menghapus sesi DB staf |
| `MAIL_MAILER`, `MAILTRAP_*`, `MAIL_FROM_*` | Email tautan lupa kata sandi dan `php artisan mail:test` | Template memakai `mailtrap-sdk` + `sandbox.api.mailtrap.io`. Tanpa token Mailtrap, ganti ke `MAIL_MAILER=log` (email ditulis ke `storage/logs/laravel.log`). Notifikasi email status surat belum diimplementasi |
| `FRONTEND_URL` | Asal frontend untuk CORS/Sanctum dan alamat tautan di email reset (`<FRONTEND_URL>/reset-password/<token>`) | Harus sama dengan alamat yang dibuka di browser |
| `SIGAP_LINK_HOSTS` | Domain SIGAP yang boleh dipakai `link_url` peringatan bencana (https), dipisah koma, mis. `sigap.example.id` | Diisi SID setelah SIGAP memberi tahu domainnya. SID tidak pernah memanggil SIGAP; daftar ini hanya untuk memeriksa link yang tampil di bar merah. Kosong = peringatan yang membawa `link_url` ditolak `422` |
| `DISASTER_ALERT_DEFAULT_HOURS`, `DISASTER_ALERT_MAX_DAYS` | Masa tayang peringatan SIGAP bila `expires_at` kosong, dan batas maksimalnya | Default `6` jam dan `3` hari (`config/disaster_alerts.php`), menunggu konfirmasi SIGAP |

### Migrate & isi data

Untuk database lokal kosong yang boleh di-reset, jalankan migration dan seeder demo:

```powershell
php artisan migrate:fresh --seed
php artisan storage:link
```

> `migrate:fresh` menghapus seluruh tabel beserta datanya. Jangan jalankan pada database yang berisi data yang ingin dipertahankan. Setelah migration di-edit, jalankan ulang `migrate:fresh --seed`.

Seeder development membuat Desa Cibenda dengan 5 dusun asli (Patrol, Sinargalih, Cibenda, Budiasih, Sucen), masing-masing 5 RW dan setiap RW 5 RT. Seeder juga mengisi profil desa (visi, misi, sejarah), perangkat desa lengkap dengan foto, Ketua RW/RT dengan nama acak, 100 warga dalam beberapa KK, 10 berita, jenis jabatan, kategori berita, katalog pekerjaan, alur persetujuan (RT → Kepala Desa), pengaturan deadline, dan jenis surat. Foto perangkat dan berita disalin dari `database/seeders/assets/` ke disk `public`, jadi jalankan `php artisan storage:link` agar foto tampil.

Akun demo untuk mencoba setiap role:

| Role | Username | Keterangan |
|---|---|---|
| Staf SIDUTama (`staf_sid`) | `demo_admin` | Satu-satunya Staf SIDUTama desa demo |
| Warga | `demo_warga` | Kepala keluarga di RT 001/RW 001 Patrol |
| Warga | `demo_warga2` | Istri `demo_warga`, satu KK (mis. untuk mencoba persetujuan saksi antar-warga) |
| Warga | `demo_warga3` | Anak tertua `demo_warga`, satu KK |
| Kepala Dusun | `demo_kadus` | Aditulloh, Kadus Patrol |
| RW | `demo_rw` | Ketua RW 001 Patrol |
| RT | `demo_rt` | Ketua RT 001/RW 001 Patrol |

Pejabat lain yang punya peran di aplikasi juga mendapat akun, supaya surat dari RT mana pun bisa diproses sampai Kepala Desa:

| Role | Username |
|---|---|
| Kepala Desa | `dede.rusliana` |
| Sekretaris Desa | `saeful.millah` |
| Kasi Pemerintahan | `sakim.hidayat` |
| Kaur TU & Umum | `tita.sutiasih` |
| Kepala Dusun lain | `kadus.<dusun>`, mis. `kadus.sinargalih` |
| RW lain | `rw.<dusun>.<nn>`, mis. `rw.sucen.21` (nomor RW urut se-desa) |
| RT lain | `rt.<dusun>.<nn>.<nn>` (RW lalu RT), mis. `rt.cibenda.12.03` |

**Password semua akun:** `Password123!`

Akun demo sudah aktif. Untuk mencoba **pendaftaran akun baru**: daftar di halaman Daftar dengan NIK warga seeder yang belum punya akun (lihat Data Penduduk saat login `demo_admin`), ambil foto wajah dari kamera (browser perlu izin kamera; `localhost`/`127.0.0.1` diizinkan tanpa HTTPS), lalu login sebagai Ketua RT wilayah warga itu (mis. `demo_rt` untuk RT 001/RW 001 Patrol) dan setujui di **Manajemen Akun → Aktivasi Akun**. Akun baru tidak bisa login sebelum disetujui. Permintaan ganti foto profil warga diputuskan di menu yang sama.

Akun dan identitas tersebut hanya untuk development/testing. Seeder demo menolak berjalan di environment `production`. Untuk mengganti data demo lama, gunakan `migrate:fresh --seed` hanya pada database yang boleh dihapus; menjalankan `db:seed` sendiri tidak menghapus data lama.

Seeder terbagi dua:

- `ReferenceDataSeeder`: data acuan tiap desa yang sudah ada, tidak bergantung pada data demo dan dipakai juga oleh `sid:install`. Isinya katalog yang setelah pemasangan dikelola desa (jenis jabatan, kategori berita, pekerjaan) ditambah `ReferenceDataSyncSeeder`.
- `ReferenceDataSyncSeeder`: data acuan milik developer yang ikut pembaruan aplikasi (alur persetujuan, setting tahap persetujuan, titik pengingat masa berlaku, jenis surat, slot organisasi desa). Aman diulang: baris baru dibuat dan struktur jenis surat diperbarui, tetapi pengaturan desa tidak ditimpa. Dipakai `sid:sync-reference-data`.
- `DemoDataSeeder`: Desa Cibenda beserta wilayah, data acuannya (lewat `ReferenceDataSeeder`), warga, perangkat desa, akun demo, dan berita.

`DatabaseSeeder` (dipakai `--seed` dan `db:seed`) hanya memanggil `DemoDataSeeder` dan menolak environment `production`.

Setelah `git pull` yang menambah jenis surat atau mengubah template/isian surat, jalankan `php artisan sid:sync-reference-data` (lihat [Perbarui data acuan setelah rilis](#perbarui-data-acuan-setelah-rilis)). Data lokal, termasuk data demo, tidak dihapus.

### Pasang desa sungguhan (database tanpa data demo)

SID melayani **satu desa per instalasi**. Pada database kosong (setelah `php artisan migrate`), pasang desa sekali dengan `sid:install`:

```powershell
php artisan sid:install --village-name="Desa Sukamaju" --village-code=3201010001 --district="Cibadak" --regency="Sukabumi" --province="Jawa Barat" --postal-code=43351 --nik=3201012345670001 --name="Nama Petugas" --dob=1980-01-01 --gender=L --address="Alamat Petugas"
```

Dalam satu transaksi, perintah ini:

1. membuat desa (`--village-name` dan `--village-code` wajib; kode desa = kode wilayah Kemendagri 10 digit tanpa titik; `--head-name`, `--district`, `--regency`, `--province`, dan `--postal-code` opsional),
2. mengisi data acuan desa (`ReferenceDataSeeder`),
3. membuat data warga, akun, dan jabatan Staf SIDUTama pertama dari `--nik`, `--name`, `--dob`, `--gender`, dan `--address`.

Opsi wajib yang kosong ditanyakan di terminal; dengan `--no-interaction` perintah langsung gagal. Data yang tidak valid ditolak sebelum ada yang tersimpan, dan perintah ditolak bila desa sudah ada (identitas desa diubah dari Kelola Profil Desa). Username dibuat otomatis dan password sementara acak hanya ditampilkan sekali; akun wajib menggantinya saat login pertama.

Di lokal, jalankan pada database kosong (`php artisan migrate:fresh` tanpa `--seed`; data lama terhapus), atau coba dulu di SQLite sekali pakai lewat `--env=testing` (bagian Test & Pemeriksaan Kode). Di server Docker, jalankan dengan awalan `bash deploy/scripts/lib.sh exec -u www-data sid_api` setelah `deploy/scripts/setup.sh` (README B3).

Wilayah Staf SIDUTama boleh dibuat sekaligus dengan `--dusun="Nama Dusun" --rw=1 --rt=1` (ketiganya diisi bersama). Perintah membuat satu dusun (kode `<kode desa>01`), satu RW, dan satu RT, lalu memasukkan warga staf ke RT itu. Tanpa opsi ini RT warga staf dibiarkan kosong. Staf SIDUTama tetap berwenang di seluruh desa; setelah login, buat Dusun/RW/RT di Kelola Wilayah lalu lengkapi RT data warganya sebelum staf mengajukan surat untuk dirinya sendiri. Lengkapi juga alamat, kontak, dan logo desa di Kelola Profil Desa.

### Perbarui data acuan setelah rilis

Rilis aplikasi bisa membawa jenis surat baru atau perubahan template/isian jenis surat. Desa yang sudah berjalan menerimanya lewat:

```powershell
php artisan sid:sync-reference-data
```

Perintah ini (meminta konfirmasi di production; `--force` untuk eksekusi non-interaktif) menjalankan `ReferenceDataSyncSeeder` dalam satu transaksi dan mencetak kode jenis surat yang baru ditambahkan. Yang **tidak** diubah:

- pengaturan desa: kategori/petugas, masa berlaku, dan status aktif jenis surat; tenggat dan pengingat persetujuan; nyala/mati pengingat masa berlaku;
- katalog milik desa (jenis jabatan, kategori berita, pekerjaan), supaya bawaan yang sudah dihapus atau dinonaktifkan desa tidak muncul lagi.

Perubahan bawaan pada kolom milik desa (mis. petugas default sebuah jenis surat) hanya berlaku untuk pemasangan baru; desa yang berjalan mengubahnya sendiri dari menu Alur & Jenis Surat. `db:seed` tidak dipakai di production.

Kapan dijalankan:

- **Lokal:** setelah `git pull` yang menyentuh `database/seeders`, cukup `php artisan sid:sync-reference-data` (tanpa konfirmasi di environment lokal).
- **Server Docker:** setiap selesai `deploy.sh`, jalankan `bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan sid:sync-reference-data --force` (README B4). Aman diulang walau rilis tidak membawa data acuan baru.

### Staf SIDUTama pertama untuk desa yang sudah terpasang

`staf-sid:first` membuat Staf SIDUTama pertama pada desa yang sudah ada tetapi belum memiliki staf aktif. Bila citizen sudah ada, cukup berikan `--nik`; command akan membuat akun atau mempromosikan akun warga yang terhubung. Untuk citizen baru, berikan data wajib citizen:

```powershell
php artisan staf-sid:first --nik=3201012345670001 --name="Nama Petugas" --dob=1980-01-01 --gender=L --address="Alamat Petugas"
```

Desa otomatis memakai desa satu-satunya di instalasi; `--village=<UUID_DESA>` hanya perlu bila ada lebih dari satu desa. `--rt=<ID_RT>` opsional dan harus RT dari desa tersebut; tanpa itu RT warga staf kosong dan dilengkapi nanti dari Kelola Wilayah. Username dibuat otomatis dan password sementara acak hanya ditampilkan sekali. Command menolak jika Staf SIDUTama aktif sudah ada, jadi pada database demo gunakan `demo_admin`.

Staf SIDUTama hanya **satu per desa**; penggantinya diproses lewat Rotasi di halaman Pejabat Desa (boleh oleh staf itu sendiri). Label perannya mengikuti `SID_APP_NAME` / `VITE_APP_NAME`, default "Staf SIDUTama".

### Pemulihan Staf SIDUTama yang lupa kata sandi

`staf-sid:first` bukan command pemulihan. Staf SIDUTama tidak bisa mereset kata sandinya sendiri dari aplikasi, jadi bila lupa, jalankan di server:

```powershell
php artisan staf-sid:recover --username=<username_staf>
```

Command meminta konfirmasi (tambahkan `--force` untuk eksekusi non-interaktif), hanya berlaku untuk akun `staf_sid` aktif yang memegang jabatan aktif, mencetak kata sandi sementara sekali, mewajibkan ganti kata sandi saat login, mengeluarkan semua sesi dan token lama, dan tercatat di activity log. Bila login terkunci karena 5 kali gagal, kunci terbuka sendiri dalam 1 jam. Pergantian pemegang jabatan tetap lewat Rotasi.

### Integrasi pihak ketiga (Cimart, SIGAP)

Aplikasi pihak ketiga memanggil `https://<domain-sid>/api/integrations/v1` dari server mereka dengan token miliknya sendiri, bukan akun SID. Arahnya selalu dari pihak ketiga ke SID; SID tidak pernah memanggil mereka. Kontrak dan kewajiban mereka ada di `docs/thirdparty/cimart/` dan `docs/thirdparty/sigap/`.

Client dibuat **sekali per aplikasi** lewat terminal. Command mencetak token pertama sekali saja (SID hanya menyimpan hash-nya):

```powershell
php artisan integration:create cimart --name="Cimart" --abilities=seller-applications:read,seller-applications:update
php artisan integration:create sigap --name="SIGAP" --abilities=alerts:write
```

Bila ada lebih dari satu desa, tambahkan `--village=<UUID_DESA>`. Setelah itu Staf SIDUTama mengelola dari menu **Integrasi**: menonaktifkan atau mengaktifkan aplikasi, menerbitkan token baru (token lama tetap berlaku sampai dicabut), dan mencabut token. Command cadangan: `integration:enable`, `integration:disable`, `integration:rotate`, `integration:tokens`, `integration:revoke`, dan `integration:abilities` (mengubah hak akses, hanya lewat terminal).

Yang diserahkan ke tim pihak ketiga lewat jalur aman (jangan grup chat): **domain production SID** dan **token**. Untuk SIGAP, minta juga domain situs mereka untuk `SIGAP_LINK_HOSTS`.

Uji koneksi dengan token yang baru dibuat:

```powershell
curl.exe -H "Authorization: Bearer <token>" -H "Accept: application/json" http://localhost:8000/api/integrations/v1/ping
```

---

## 3. Menjalankan Backend

Jalankan di `apps\backend`, masing-masing di **terminal terpisah** dan biarkan terbuka:

| Terminal | Perintah | Fungsi | Wajib? |
|---|---|---|---|
| 1 | `php artisan serve` | API di `http://localhost:8000` | Ya |
| 2 | `php artisan schedule:work` | Scheduler: tiap 5 menit menjalankan `approvals:send-reminders`, tiap jam `letters:send-expiry-reminders`, tiap menit `announcements:prune`, tiap hari pukul 02.00 `disaster-alerts:prune` (activity log sengaja tidak dibersihkan) | Untuk pengingat approval, pengingat masa berlaku surat, dan pembersihan pengumuman serta peringatan SIGAP lama |
| 3 | `php artisan queue:work` | Worker antrean: mengirim **semua** Web Push, **seluruh** notifikasi peringatan SIGAP (in-app maupun push), dan sinyal realtime | Untuk push browser, wajib untuk notifikasi peringatan SIGAP, dan untuk realtime (bila `QUEUE_CONNECTION=database`) |
| 4 | `php artisan reverb:start` | Server WebSocket realtime di `127.0.0.1:8080` | Opsional. Tanpa ini (atau bila `BROADCAST_CONNECTION` bukan `reverb`), data tetap diperbarui lewat polling |

```powershell
php artisan serve
php artisan schedule:work
php artisan queue:work
php artisan reverb:start
```

### Kenapa ada scheduler?

Pengingat approval dipicu oleh **waktu**, bukan oleh klik pengguna. `schedule:work` berjalan terus dan tiap 5 menit memeriksa surat yang sisa waktunya sudah tinggal `reminder_hours` sebelum deadline. Bila ada, satu pengingat dikirim ke approver tahap itu (sekali per tahap per surat, dicatat di `reminded_at`). Bila tidak ada, ia diam. Jadwalnya diatur di `routes/console.php`; perintah ini tidak perlu diketik manual. Untuk uji cepat tanpa menunggu 5 menit:

```powershell
php artisan approvals:send-reminders
```

Pengingat **masa berlaku surat** juga dijalankan scheduler, tiap jam lewat `letters:send-expiry-reminders`. Pemohon surat yang sudah terbit menerima notifikasi pada H-30, H-14, H-7, H-3, dan H-1 sebelum suratnya kedaluwarsa, serta pada hari H (hari pertama surat tidak bisa diunduh). Di halaman **Alur & Jenis Surat**, tab **Pengingat Masa Berlaku**, Staf SIDUTama mengatur **jam kirim** (jam bulat 06.00–21.00 WIB, nilai awal 09.00, disimpan di `villages.expiry_reminder_send_at`) dan menyalakan atau mematikan titik H-30 sampai H-1; hari H selalu dikirim. Masa tenggang hari H diatur di `config/letters.php` (`LETTER_EXPIRY_REMINDER_GRACE_DAYS`, default `3`).

Bila scheduler sempat mati, run berikutnya hanya mengirim satu pengingat terdekat per surat dengan sisa hari yang benar, bukan semua yang terlewat. Bila sebuah surat gagal diproses (misalnya koneksi database putus sesaat), surat lain tetap diproses, error-nya dicatat di log, dan surat itu dicoba lagi di run berikutnya. Untuk uji manual:

```powershell
# Hasilnya: "Pengingat masa berlaku surat terkirim: N."
# Bila ada yang gagal, ditambah "Gagal diproses: M (lihat log)." dan command keluar dengan status gagal.
php artisan letters:send-expiry-reminders
```

Untuk melihat pengingat terkirim tanpa menunggu berbulan-bulan, buat surat yang sudah disetujui lalu majukan masa berlakunya lewat `php artisan tinker`, misalnya agar hari terakhirnya hari ini (titik H-1 jatuh tempo hari ini pada jam kirim desa):

```php
$letter = App\Models\Letter::query()->where('status', 'approved')->latest()->first();
$letter->forceFill(['expires_at' => now()->endOfDay(), 'expiry_notified_days' => null])->save();
```

Lalu jalankan `php artisan letters:send-expiry-reminders` setelah jam kirim desa (lihat tab Pengingat Masa Berlaku di halaman Alur & Jenis Surat) dan lihat lonceng notifikasi akun pemohon. Pengingat hanya dikirim untuk titik yang jatuh tempo setelah `processed_at` surat, jadi surat yang baru disetujui hari ini tidak menerima titik yang tanggalnya sudah lewat.

### Kenapa ada worker antrean?

Notifikasi surat dikirim lewat dua jalur: **in-app** (lonceng) ditulis langsung ke database dan selalu masuk, sedangkan **Web Push** harus menghubungi layanan push browser di internet.

- `QUEUE_CONNECTION=database` (default lokal dan stack Docker): push dicatat dulu di tabel `jobs`, lalu dikirim `queue:work` di belakang layar. Tombol Ajukan/Setujui tetap cepat. Tanpa worker, push tertahan (lonceng tetap masuk) dan langsung terkirim saat worker dinyalakan. Di Docker, worker berjalan otomatis di service `sid_worker`.
- `QUEUE_CONNECTION=sync`: push dikirim saat itu juga di dalam request, tanpa worker. Lebih praktis untuk lokal, tetapi tombol menunggu push selesai.

**Peringatan bencana SIGAP berbeda:** notifikasinya dikirim ke semua akun aktif desa, jadi seluruh pengirimannya (termasuk lonceng in-app) dijalankan job antrean `SendDisasterAlertNotifications`, bukan di dalam request SIGAP. Tanpa worker, peringatan tetap tampil di bar merah halaman publik, tetapi **tidak ada notifikasi sama sekali** sampai worker dinyalakan.

Cek push yang gagal: `php artisan queue:failed`; coba lagi: `php artisan queue:retry all`.

> Setelah mengubah kode backend atau `.env`, matikan (Ctrl+C) lalu jalankan ulang `schedule:work` dan `queue:work`, karena keduanya memuat kode sekali di awal. `reverb:start` cukup dijalankan ulang bila variabel `REVERB_*` berubah.

### Kenapa ada server Reverb? (realtime, opsional)

Tanpa realtime, browser menanyakan data berkala ke server (polling): jumlah notifikasi dan daftar surat tiap 30 detik, grafik dashboard dan peringatan bencana tiap 60 detik. Dengan realtime, server memberi sinyal lewat WebSocket begitu ada perubahan, lalu browser mengambil ulang datanya saat itu juga.

- Alurnya: aksi pengguna (mis. Kades menyetujui surat) → event diantrekan → `queue:work` mengirimnya ke `reverb:start` → browser yang berlangganan menerima sinyal `{ type, id }` → React Query mengambil ulang lewat API biasa. Jadi realtime butuh **ketiganya**: `BROADCAST_CONNECTION=reverb`, `queue:work`, dan `reverb:start`.
- Bila salah satunya mati, aplikasi tetap jalan: polling kembali ke interval di atas. Selama WebSocket tersambung, polling hanya berjalan tiap 5 menit sebagai jaring pengaman.
- Dengan `QUEUE_CONNECTION=sync`, sinyal dikirim di dalam request. Bila `reverb:start` tidak jalan, aksi (mis. menyetujui surat) tetap berhasil; galat pengirimannya hanya dicatat di `storage/logs/laravel.log`.
- Frontend tidak perlu env tambahan; alamat dan key Reverb dibaca dari `GET /api/realtime/config`.
- Cek cepat: buka DevTools → Network → filter **WS**. Harus ada koneksi ke `127.0.0.1:8080/app/...` berstatus 101, dan pesan `notification.created` / `letter.changed` / `disaster-alerts.changed` muncul saat ada perubahan. `php artisan reverb:start --debug` menampilkan koneksi dan pesan di terminal.

### Notifikasi Web Push (opsional)

Notifikasi in-app berjalan tanpa konfigurasi tambahan. Untuk push browser:

1. `php artisan webpush:vapid` (menulis `VAPID_PUBLIC_KEY` dan `VAPID_PRIVATE_KEY` ke `apps/backend/.env`), lalu lengkapi `VAPID_SUBJECT`.
2. Isi `VITE_VAPID_PUBLIC_KEY` di `apps/frontend/.env` dengan nilai `VAPID_PUBLIC_KEY` yang sama, lalu restart `npm run dev`.
3. Jalankan `queue:work` (atau pakai `QUEUE_CONNECTION=sync`).
4. Buka frontend lewat `127.0.0.1`/`localhost` (browser menolak push di IP LAN tanpa HTTPS), aktifkan push dari popover lonceng, dan izinkan notifikasi.

### Email lupa kata sandi (opsional)

Email reset kata sandi dikirim langsung saat diminta (tanpa `queue:work`). Di lokal, kirim ke **Mailtrap Sandbox** agar email tertahan di inbox uji dan tidak sampai ke penerima sungguhan:

1. Di [mailtrap.io](https://mailtrap.io), buka **Sandboxes** → inbox. ID inbox ada di URL: `https://mailtrap.io/inboxes/<INBOX_ID>/messages`.
2. Buat token di [Settings → API Tokens](https://mailtrap.io/settings/api-tokens) dengan akses ke inbox tersebut.
3. Isi `MAILTRAP_API_KEY` dan `MAILTRAP_INBOX_ID` di `apps/backend/.env` (`MAIL_MAILER=mailtrap-sdk` dan `MAILTRAP_HOST=sandbox.api.mailtrap.io` sudah ada di template), lalu `php artisan config:clear`.
4. Uji: `php artisan mail:test alamat@contoh.com`, email harus muncul di inbox sandbox.
5. Uji alur penuh: akun seeder tidak punya email, jadi login (mis. `demo_warga`), isi email di Profil, logout, lalu pakai **Lupa Kata Sandi**.

Akun **tanpa email** memakai jalur lain yang tidak butuh Mailtrap: di halaman Lupa Kata Sandi pilih jalur NIK (`/forgot-password/nik`), isi NIK + tanggal lahir, lalu login sebagai `demo_admin` dan setujui di **Pengajuan Reset**. Kembali ke halaman tadi **di browser yang sama** (token klaim disimpan di browser itu) untuk membuat kata sandi baru dalam 24 jam.

Konfigurasi produksi (Mailtrap Sending dengan domain terverifikasi, kunci VAPID produksi) ada di [README](../README.md#b-produksi).

---

## 4. Setup Frontend

Buka terminal baru (biarkan proses backend tetap jalan):

```powershell
cd apps\frontend
npm install
copy .env.example .env
npm run dev
```

Isi `apps/frontend/.env`:

```env
# Samakan dengan SID_APP_NAME di backend.
VITE_APP_NAME=SIDUTama
VITE_API_URL=http://127.0.0.1:8000
# Harus sama dengan VAPID_PUBLIC_KEY di apps/backend/.env (kosong = push nonaktif).
VITE_VAPID_PUBLIC_KEY=
```

> `.env.example` frontend dan backend sama-sama memakai `127.0.0.1`. Pilih satu host (`localhost` atau `127.0.0.1`) dan pakai konsisten di `VITE_API_URL`, `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, dan alamat yang dibuka di browser; mencampur keduanya membuat cookie sesi tidak terkirim.

Frontend jalan di `http://127.0.0.1:5173`. Setelah mengubah `.env` frontend, restart `npm run dev`.

Realtime tidak butuh variabel frontend: alamat dan key Reverb dibaca dari backend (`GET /api/realtime/config`, diisi `REVERB_CLIENT_*` di `apps/backend/.env`).

---

## 5. Auth Cookie-based, Bukan Bearer Token

Project pakai **Laravel Sanctum SPA authentication** - session/cookie based, bukan token di localStorage.

- Jangan simpan token di `localStorage` atau `sessionStorage`
- Axios instance di `src/lib/api.ts` sudah di-setup `withCredentials: true` dan `withXSRFToken: true`
- Sebelum login, wajib panggil `GET /sanctum/csrf-cookie` dulu, baru `POST /login` (rute web, tanpa prefix `/api`)
- Setelah login, cookie session otomatis terkirim di setiap request — tidak perlu manual attach header

Contoh flow login:
```ts
import api from '@/lib/api'

async function login(username: string, password: string) {
  await api.get('/sanctum/csrf-cookie')
  const { data } = await api.post('/login', { username, password })
  return data.user // sama dengan GET /api/user
}
```

Login akun yang belum aktif dijawab `403` dengan pesan sesuai status pendaftarannya (menunggu aktivasi, ditolak, atau diblokir).

---

## 6. Test & Pemeriksaan Kode

```powershell
# Backend: memakai SQLite in-memory (phpunit.xml), tidak menyentuh database di .env.
# CI menjalankan suite yang sama di PostgreSQL 16, jadi beberapa error (mis. tipe UUID) hanya muncul di CI.
cd apps\backend
php artisan test
.\vendor\bin\pint --test

# Frontend
cd apps\frontend
npm run lint
npm run format:check   # prettier --check; perbaiki dengan npm run format
npm run typecheck      # tsc --noEmit; build tidak memeriksa tipe
npm run test:run
npm run build
```

> Jangan menjalankan `php artisan migrate` manual untuk "mengecek" migration: perintah itu memakai database di `.env`. Cukup jalankan test.

Untuk mencoba perintah artisan tanpa menyentuh database `.env`, buat `apps/backend/.env.testing` (tidak di-commit) dari `.env.example` dengan `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=database/testing.sqlite`, `SESSION_DRIVER=array`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `BROADCAST_CONNECTION=null`, dan `MAIL_MAILER=array`, lalu isi kuncinya dengan `php artisan key:generate --env=testing`. Perintah dengan `--env=testing` (dijalankan dari `apps/backend`) memakai berkas SQLite sekali pakai itu, mis. `php artisan migrate:fresh --env=testing` lalu `php artisan sid:install --env=testing ...`. `php artisan test` juga memuat `.env.testing` bila ada, tetapi nilai di `phpunit.xml` (SQLite in-memory) tetap berlaku. Cek tujuan database dulu dengan `php artisan config:show database.default --env=testing` (harus `sqlite`).

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| `could not find driver` | Extension PDO PostgreSQL belum aktif | Aktifkan `pgsql` dan `pdo_pgsql` di `php.ini`, lalu restart terminal |
| `419 Page Expired` saat login | CSRF token tidak sync, atau host frontend/API berbeda (`localhost` vs `127.0.0.1`) | Panggil `GET /sanctum/csrf-cookie` dulu, pastikan `withCredentials: true`, samakan host |
| `401 Unauthenticated` setelah login | `SANCTUM_STATEFUL_DOMAINS` tidak sesuai host:port frontend | Samakan persis dengan alamat `npm run dev`, lalu `php artisan config:clear` |
| Env baru tidak terbaca | Config di-cache | `php artisan config:clear` |
| Pesan validasi/error API masih berbahasa Inggris ("The name field is required.") | `APP_LOCALE`/`APP_FALLBACK_LOCALE` di `.env` masih `en` (dari `.env.example` lama) atau config ter-cache | Set `APP_LOCALE=id`, `APP_FALLBACK_LOCALE=id`, `APP_FAKER_LOCALE=id_ID`, lalu `php artisan config:clear` |
| CORS error | `allowed_origins` tidak sesuai `FRONTEND_URL` | Cek `config/cors.php`, pastikan `supports_credentials: true` |
| Foto perangkat/berita tidak tampil | Link storage belum dibuat | `php artisan storage:link` |
| Push browser tidak muncul, lonceng muncul | Worker tidak jalan (`QUEUE_CONNECTION=database`) atau VAPID kosong | Jalankan `php artisan queue:work`; cek `VAPID_*` dan `VITE_VAPID_PUBLIC_KEY` |
| Pengingat approval tidak pernah datang | `schedule:work` tidak jalan, atau setting tahap nonaktif | Jalankan `php artisan schedule:work`; uji dengan `php artisan approvals:send-reminders` |
| Pengingat masa berlaku surat tidak datang | `schedule:work` tidak jalan, belum jam kirim desa, titik dimatikan di tab Pengingat Masa Berlaku (Alur & Jenis Surat), akun pemohon nonaktif, atau jatuh tempo titik sebelum surat disetujui | Jalankan `php artisan schedule:work`; uji dengan `php artisan letters:send-expiry-reminders` |
| Perubahan kode tidak berefek di push/pengingat | Worker/scheduler memakai kode lama | Restart `queue:work` dan `schedule:work` |
| Notifikasi/surat tidak langsung berubah, baru setelah ±30 detik | Realtime nonaktif atau putus: `BROADCAST_CONNECTION` bukan `reverb`, `reverb:start` atau `queue:work` tidak jalan, atau config ter-cache | Jalankan ketiganya, `php artisan config:clear`, lalu muat ulang halaman. Cek `GET /api/realtime/config` (`enabled: true`) dan tab WS di DevTools |
| Console browser: `WebSocket connection to 'ws://127.0.0.1:8080/app/...' failed` | `reverb:start` tidak jalan atau `REVERB_CLIENT_*` tidak cocok dengan alamat Reverb | Jalankan `php artisan reverb:start`; samakan `REVERB_CLIENT_*` dengan `REVERB_SERVER_HOST/PORT`. Aplikasi tetap jalan dengan polling |
| `php artisan queue:failed` berisi `BroadcastEvent` | Reverb mati saat event dikirim | Nyalakan `reverb:start`; job lama boleh dihapus (`php artisan queue:flush`), tampilan sudah disegarkan polling |
| Staf SIDUTama lupa kata sandi | Staf tidak bisa mereset dirinya sendiri | `php artisan staf-sid:recover --username=...` |
| Akun baru tidak bisa login (`403` menunggu aktivasi) | Pendaftaran online belum disetujui petugas wilayah | Login sebagai RT wilayah warga (atau RW/Kadus/`demo_admin` bila jenjang di bawahnya kosong), setujui di Manajemen Akun → Aktivasi Akun |
| Kamera tidak bisa dibuka di halaman Daftar / ganti foto | Browser menolak kamera di alamat non-HTTPS selain `localhost`/`127.0.0.1`, atau izin kamera ditolak | Buka lewat `127.0.0.1`/`localhost`, izinkan kamera di pengaturan situs |
| Unduh PDF dengan pilihan kertas lain gagal (`Class "setasign\Fpdi\..." not found`) | Dependensi composer belum terpasang setelah pull | `composer install` di `apps\backend` |

---

## Cek Cepat Tanpa Frontend

Bisa pakai curl (Git Bash/WSL) atau Postman dengan cookie jar aktif untuk test backend saja. Detail command curl bisa ditanyakan ke tim backend.
[[STRUKTUR_FOLDER]]
