# SIDUTama Cibenda

**Sistem Informasi Desa (SID)** untuk Desa Cibenda. Aplikasi web ini mendigitalisasi layanan administrasi surat, pengelolaan data kependudukan, informasi publik desa, dan alur kerja perangkat desa.

> Status: pengembangan aktif. Kode, migration, dan route yang berjalan adalah sumber kebenaran implementasi; dokumen di `docs/` diselaraskan dengannya.

Nama aplikasi yang tampil ke pengguna (judul, `<title>`, manifest PWA, label peran staf) dapat diganti lewat `SID_APP_NAME` (backend) dan `VITE_APP_NAME` (frontend). Default-nya **SIDUTama**, sehingga peran staf aplikasi (`staf_sid`) tampil sebagai **Staf SIDUTama**; dokumen di repo ini memakai nama default tersebut.

## Fitur utama

- **Surat online:** warga (atau pejabat untuk dirinya sendiri) mengajukan surat dengan form dinamis per jenis surat, unggahan berkas, dan tanda tangan pihak terkait; status dipantau sampai PDF dapat diunduh. Pilihan jenis surat dikelompokkan menjadi **Persuratan Desa** (surat keterangan desa) dan **Layanan Kependudukan** (formulir kependudukan Disdukcapil). Seeder menyediakan 11 jenis surat keterangan Persuratan Desa (A01–A11, termasuk Surat Keterangan Ahli Waris yang berlaku tanpa batas). Isian pekerjaan di form memakai katalog pekerjaan desa, dengan pilihan "Lainnya" yang teksnya dirapikan dan hanya dicetak di surat.
- **Layanan Kependudukan (F01–F10):** Surat Pernyataan Tidak Memiliki Dokumen Kependudukan, Perubahan Elemen Data, Pindah Keluar, Pindah Datang, Pelaporan Kelahiran, Pelaporan Kematian, Pelaporan Perkawinan/Perceraian, Pengakuan Anak, Perubahan Susunan KK, dan Pelaporan Pengangkatan Anak. Tiap layanan menerbitkan formulir Disdukcapil yang dibangun dari Excel aslinya (F-1.01, F-1.02, F-2.01, dst.) beserta formulir pendukung yang hanya terbit bila dibutuhkan jawaban form; formulir tanpa nomor dan tanpa TTD Kepala Desa, TTD pemohon dan pejabat (RT/RW, Kasi Pemerintahan) ditempel otomatis saat final. Isian mengambil data dari database (anggota KK, NIK warga desa, data orang tua, kode wilayah) dan memeriksa aturan seperti urutan tanggal, SHDK sesuai jenis kelamin, dan satu kepala keluarga. Pihak lain (saksi, pasangan, kepala KK tujuan, penerima kuasa) diminta persetujuannya lewat akunnya. Semua layanan punya opsi **"Diurus orang lain"** yang menerbitkan Surat Kuasa F-1.07. Setelah formulir terbit, pemohon mengunggah hasil dari Disdukcapil di surat yang sama; setelah diverifikasi Kasi Pemerintahan, perubahan data warga/KK diterapkan otomatis lewat **Terapkan** dengan pop up daftar perubahan (lama → baru) untuk dikonfirmasi.
- **Persetujuan:** alur default **RT → Kepala Desa/Sekretaris Desa (final)**. RW dan Kadus menerima pemberitahuan setelah RT menyetujui; Kasi Pemerintahan / Kaur TU & Umum menerima surat yang sudah final sesuai penugasan jenis suratnya (seluruh jenis surat bawaan A01–A11 ditugaskan ke Kaur TU & Umum). Saat final, sistem menerbitkan nomor surat dan membekukan snapshot render PDF.
- **Deadline & pengingat:** tiap tahap punya batas waktu; surat yang lewat deadline ditandai overdue, dan scheduler mengirim satu pengingat ke approver `reminder_hours` sebelum deadline.
- **Masa berlaku surat:** dicap saat final approve dari pengaturan jenis surat. Surat yang kedaluwarsa tetap tampil sebagai riwayat, tetapi pemohon tidak dapat lagi mengunduh atau mem-preview PDF-nya.
- **Data kependudukan:** warga (termasuk 11 SHDK resmi Disdukcapil serta dokumen & keterangan tambahan untuk Biodata Keluarga: gelar, akta lahir/perkawinan/perceraian, kelainan fisik & mental), Kartu Keluarga, data sosio-ekonomi KK, wilayah Dusun/RW/RT, dan katalog pekerjaan, dengan impor Excel. NIK, No KK, nomor akta, dan keterangan penyandang cacat disimpan terenkripsi.
- **Log Aktivitas:** setiap perubahan data warga/KK oleh staf tercatat (nilai lama → baru, data sensitif disamarkan), bersama riwayat status semua surat, dalam satu halaman khusus Staf SIDUTama.
- **Konten publik:** beranda, profil desa, berita berkategori, peraturan desa, struktur pemerintahan, BPD, LPM/Karang Taruna/PKK, dan informasi jenis surat.
- **Notifikasi:** in-app (lonceng) dan Web Push (PWA).

## Role

| Role | Tanggung jawab utama |
| --- | --- |
| Warga | Mengajukan, melacak, dan mengunduh surat miliknya |
| RT | Approver tahap pertama untuk warga di wilayahnya |
| RW / Kadus | Menerima pemberitahuan dan melihat surat di wilayahnya setelah disetujui RT |
| Kepala Desa / Sekretaris Desa | Approver final |
| Kasi Pemerintahan / Kaur TU & Umum | Menerima, mengunduh, dan menerapkan perubahan data dari surat yang sudah final sesuai penugasan. Kaur TU & Umum memegang surat keterangan desa (A01–A11); Kasi Pemerintahan memegang Layanan Kependudukan (verifikasi hasil dari Disdukcapil, lalu Terapkan) dan ikut mengelola Data Penduduk & KK seperti Staf SIDUTama; Kaur TU & Umum hanya melihat Data Penduduk & KK. Kasi Pelayanan adalah jabatan tanpa akun |
| Staf SIDUTama (`staf_sid`) | Mengelola akun, jabatan, data kependudukan, wilayah, konten desa, konfigurasi jenis surat & deadline, serta memantau seluruh surat dan Log Aktivitas. Hanya **satu per desa**; pergantian lewat Rotasi |

## Arsitektur

Monorepo ini memiliki dua aplikasi independen:

```text
sid-app/
├── apps/
│   ├── backend/     Laravel REST API
│   └── frontend/    React SPA (Vite)
├── deploy/          docker compose + skrip deploy (staging/produksi)
├── docs/            desain teknis, arsitektur, spesifikasi API, dan panduan tim
└── README.md
```

- **Backend:** PHP 8.3+, Laravel 13, Laravel Sanctum, DomPDF, spatie/laravel-activitylog, queue & scheduler Laravel, Laravel Reverb (WebSocket realtime), PHPUnit.
- **Frontend:** React 19, Vite 8, React Router, TanStack Query, Axios, Laravel Echo + pusher-js, Tailwind CSS v4, Vitest, React Testing Library.
- **Autentikasi:** Laravel Sanctum berbasis session/cookie HttpOnly. Token tidak disimpan di `localStorage` atau `sessionStorage`.
- **Database:** PostgreSQL (`DB_CONNECTION=pgsql`). Test backend memakai SQLite in-memory.

## Prasyarat

- PHP 8.3+ dengan ekstensi `pdo_pgsql` (dan `gd` dengan dukungan WebP untuk optimasi gambar)
- Composer
- Node.js 20.19+ atau 22.12+ (syarat Vite 8)
- PostgreSQL

## Fitur opsional: email, Web Push, dan realtime

Aplikasi tetap jalan tanpa ketiga fitur ini; isi env-nya hanya bila fiturnya dipakai.

| Fitur | Dipakai untuk | Bila tidak dikonfigurasi |
| --- | --- | --- |
| Email (Mailtrap) | Tautan **Lupa Kata Sandi** lewat email, perintah `php artisan mail:test` | Pakai `MAIL_MAILER=log`: email tidak terkirim, isinya (termasuk tautan reset) ditulis ke `storage/logs/laravel.log` |
| Web Push (VAPID) | Notifikasi push browser (status surat, permintaan reset kata sandi/TTD, dll.) | Push nonaktif; notifikasi in-app (lonceng) tetap masuk |
| Realtime (Laravel Reverb) | Lonceng notifikasi, daftar surat, grafik dashboard, dan peringatan bencana langsung berubah tanpa menunggu | `BROADCAST_CONNECTION=log`/`null`: data diperbarui lewat polling (30–60 detik) seperti biasa |

Realtime butuh `php artisan reverb:start` dan `queue:work` (event diantrekan). Bila Reverb, worker, atau koneksi WebSocket bermasalah, frontend otomatis kembali polling.

Email dikirim lewat API Mailtrap (paket `railsware/mailtrap-php`, mailer `mailtrap-sdk`) secara langsung, tanpa `queue:work`. Web Push selalu diantrekan, jadi butuh `queue:work` (atau `QUEUE_CONNECTION=sync` di lokal). Browser hanya mengizinkan push di HTTPS, `localhost`, atau `127.0.0.1`.

Jangan commit token Mailtrap, `VAPID_PRIVATE_KEY`, `APP_KEY`, atau password database. Kunci publik VAPID memang tertanam di bundle frontend dan aman diketahui publik.

## A. Dev lokal (testing)

Langkah lebih rinci (akun demo lengkap, troubleshooting) ada di [`docs/SETUP.md`](docs/SETUP.md).

### A1. Install

```powershell
cd apps\backend
composer install
copy .env.example .env
php artisan key:generate

cd ..\frontend
npm install
copy .env.example .env
```

`.env.example` backend dan frontend adalah template dev lokal: strukturnya sama dengan `.env` tim, nilai non-rahasia sudah terisi, rahasia dikosongkan. Buat database PostgreSQL kosong (mis. `sidutama`) sebelum lanjut.

### A2. Env backend (`apps/backend/.env`)

**Minimal** (cukup untuk login, surat, dan notifikasi in-app):

```env
# Sudah terisi oleh key:generate
APP_KEY=base64:...

# Default npm run dev (port 5173). Jangan campur localhost dan 127.0.0.1.
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:5173
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173,localhost:5173

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sidutama
DB_USERNAME=postgres
DB_PASSWORD=isi_password_postgresql_anda

# Tanpa Mailtrap: email ditulis ke storage/logs/laravel.log.
MAIL_MAILER=log
```

**Semua fitur** (tambahan di atas minimal; ganti `MAIL_MAILER=log` dengan blok email ini):

```env
# Email lupa kata sandi -> Mailtrap Sandbox (email tertahan di inbox uji,
# tidak pernah sampai ke penerima sungguhan).
MAIL_MAILER=mailtrap-sdk
MAILTRAP_HOST=sandbox.api.mailtrap.io
MAILTRAP_API_KEY=<token_api_mailtrap>
MAILTRAP_INBOX_ID=<id_inbox_sandbox>
MAIL_FROM_ADDRESS="noreply@sidutama.test"
MAIL_FROM_NAME="${APP_NAME}"

# Web Push. VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY diisi otomatis oleh
# php artisan webpush:vapid.
VAPID_SUBJECT="mailto:admin@example.com"
VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>

# Opsional: push dikirim langsung tanpa queue:work (tombol sedikit lebih lambat).
# QUEUE_CONNECTION=sync

# Realtime (Laravel Reverb), sudah terisi di .env.example. Butuh reverb:start + queue:work.
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=sid-local
REVERB_APP_KEY=sid-local-key
REVERB_APP_SECRET=sid-local-secret
REVERB_HOST=127.0.0.1
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8080
REVERB_CLIENT_HOST=127.0.0.1
REVERB_CLIENT_PORT=8080
REVERB_CLIENT_SCHEME=http
```

Cara mendapatkan nilainya:

- **Mailtrap Sandbox:** masuk ke [mailtrap.io](https://mailtrap.io), buka **Sandboxes** → inbox (atau buat baru). ID inbox ada di URL: `https://mailtrap.io/inboxes/<INBOX_ID>/messages`. Buat token di [Settings → API Tokens](https://mailtrap.io/settings/api-tokens) dengan akses ke inbox itu. Di sandbox, `MAIL_FROM_ADDRESS` boleh alamat apa saja.
- **VAPID:** jalankan `php artisan webpush:vapid` di `apps\backend`; kuncinya langsung ditulis ke `.env`.

Setelah mengubah `.env`, jalankan `php artisan config:clear`.

### A3. Env frontend (`apps/frontend/.env`)

**Minimal:**

```env
VITE_APP_NAME=SIDUTama
VITE_API_URL=http://127.0.0.1:8000
```

**Semua fitur** (tambahan):

```env
# Sama persis dengan VAPID_PUBLIC_KEY di apps/backend/.env.
VITE_VAPID_PUBLIC_KEY=<public_key>
```

Samakan `VITE_APP_NAME` dengan `SID_APP_NAME` backend, dan host `VITE_API_URL` dengan `APP_URL`. Variabel `VITE_*` dibaca saat start, jadi restart `npm run dev` setelah mengubahnya.

### A4. Isi database

Untuk database lokal yang boleh di-reset, pakai seeder demo:

```powershell
cd apps\backend
php artisan migrate:fresh --seed
php artisan storage:link
```

Seeder membuat Desa Cibenda lengkap dengan wilayah, perangkat desa, warga, berita, dan akun demo (mis. `demo_admin` untuk Staf SIDUTama, `demo_warga` untuk warga, `demo_warga2`/`demo_warga3` untuk istri dan anaknya; kata sandi `Password123!`). Daftar lengkap akun ada di SETUP. Seeder demo menolak berjalan di `APP_ENV=production`.

Untuk database lokal tanpa data demo (meniru desa sungguhan), kosongkan dengan `php artisan migrate:fresh` lalu pasang desa dan Staf SIDUTama pertama dengan `php artisan sid:install`. Data wajib yang tidak diberikan lewat opsi akan ditanyakan; contoh lengkap ada di SETUP.

Setelah `git pull` yang menambah jenis surat atau mengubah template/isian surat, perbarui data acuan tanpa menghapus data lokal:

```powershell
php artisan sid:sync-reference-data
```

`migrate:fresh --seed` juga memuat data acuan terbaru, tetapi mengulang data demo dari awal.

### A5. Jalankan

Masing-masing di terminal terpisah dan biarkan terbuka:

| Terminal | Folder | Perintah | Fungsi | Wajib? |
| --- | --- | --- | --- | --- |
| 1 | `apps\backend` | `php artisan serve` | API di `http://127.0.0.1:8000` | Ya |
| 2 | `apps\backend` | `php artisan schedule:work` | Scheduler: pengingat approval tiap 5 menit, pembersihan log aktivitas harian | Untuk fitur pengingat |
| 3 | `apps\backend` | `php artisan queue:work` | Worker antrean: mengirim **semua** Web Push dan sinyal realtime | Untuk push browser dan realtime (kecuali `QUEUE_CONNECTION=sync`) |
| 4 | `apps\backend` | `php artisan reverb:start` | Server WebSocket realtime di `127.0.0.1:8080` | Opsional; tanpa ini data diperbarui lewat polling |
| 5 | `apps\frontend` | `npm run dev` | Frontend di `http://127.0.0.1:5173` | Ya |

- Notifikasi in-app (lonceng) selalu masuk tanpa worker. Push yang tertunda langsung terkirim begitu `queue:work` dinyalakan.
- Setelah mengubah kode backend atau `.env`, restart `queue:work` dan `schedule:work` (Ctrl+C lalu jalankan lagi).
- Script `composer dev` / `composer setup` bawaan template Laravel menjalankan `npm` di folder backend yang tidak punya `package.json`; jangan dipakai, jalankan perintah di atas secara manual.

### A6. Uji email dan push

- **Email:** `php artisan mail:test alamat@contoh.com` → email muncul di inbox sandbox Mailtrap. Untuk alur penuh, akun seeder belum punya email: login (mis. `demo_warga`), isi email di halaman Profil, logout, lalu pakai **Lupa Kata Sandi** dan buka tautan reset dari inbox sandbox.
- **Push:** buka `http://127.0.0.1:5173` (bukan IP LAN), login, aktifkan push dari popover lonceng, izinkan notifikasi, lalu ajukan/setujui surat.

## B. Produksi

Stack staging/produksi memakai Docker (`sid_db`, `sid_api`, `sid_scheduler`, `sid_worker`, `sid_reverb`, `sid_web`). Image dibangun di server dari source (`--build`) atau ditarik dari registry, lalu dijalankan lewat skrip di `deploy/scripts/`. Di Docker, `QUEUE_CONNECTION=database`: push dan sinyal realtime dikirim service `sid_worker`, scheduler berjalan di `sid_scheduler`, dan server WebSocket di `sid_reverb` (Nginx `sid_web` meneruskan `/app/` ke sana), jadi tidak perlu menjalankan apa pun manual. Env runtime ada di `deploy/sid.env` (template `deploy/sid.env.example`, atau `deploy/sid.neon.env.example` untuk DB Neon) dan `deploy/compose.env` (template `deploy/compose.env.example`). Semua file env wajib `chmod 600`; skrip menolak jalan bila masih ada placeholder `<...>`.

Satu-satunya port host adalah `127.0.0.1:<SID_HTTP_PORT>` (default 8100). Reverse proxy server harus meneruskan header `Host` asli, mengirim `X-Forwarded-Proto: https` dan `X-Forwarded-For`, serta mengizinkan body minimal 25 MB (unggahan sampai 24 MB). Untuk realtime, proxy juga harus meneruskan **WebSocket** (`/app/`): header `Upgrade`/`Connection` dan batas waktu baca yang panjang. Contoh Nginx di host:

```nginx
map $http_upgrade $connection_upgrade { default upgrade; '' close; }

location / {
    proxy_pass http://127.0.0.1:8100;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 300s;
    client_max_body_size 31m;
}
```

Bila proxy belum bisa meneruskan WebSocket, set `BROADCAST_CONNECTION=null`: aplikasi berjalan dengan polling.

### B1. Env backend (`deploy/sid.env` atau `.env` server)

**Minimal:**

```env
APP_NAME=SIDUTama
SID_APP_NAME=SIDUTama
APP_ENV=production
APP_DEBUG=false
# Dibuat SEKALI: echo "base64:$(openssl rand -base64 32)". Jangan diganti setelah
# dipakai: semua sesi/cookie terenkripsi jadi tidak valid.
APP_KEY=<APP_KEY>

# URL publik HTTPS tanpa garis miring akhir. SPA dan API satu origin.
APP_URL=https://<hostname_publik>
FRONTEND_URL=https://<hostname_publik>
SANCTUM_STATEFUL_DOMAINS=<hostname_publik>
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true

CACHE_STORE=database
QUEUE_CONNECTION=database
LOG_CHANNEL=stderr
LOG_LEVEL=warning

DB_CONNECTION=pgsql
DB_HOST=sid_db
DB_PORT=5432
DB_DATABASE=sid
DB_USERNAME=sid
DB_PASSWORD=<DB_PASSWORD>

MAIL_MAILER=log
```

**Semua fitur** (tambahan; ganti `MAIL_MAILER=log` dengan blok email ini):

```env
# Email -> Mailtrap Sending (terkirim sungguhan).
MAIL_MAILER=mailtrap-sdk
MAILTRAP_HOST=send.api.mailtrap.io
MAILTRAP_API_KEY=<token_sending_produksi>
# Kosong: hanya dipakai untuk sandbox.
MAILTRAP_INBOX_ID=
# WAJIB di domain yang sudah terverifikasi di Mailtrap.
MAIL_FROM_ADDRESS="no-reply@<domain_desa>"
MAIL_FROM_NAME="SIDUTama Desa Cibenda"

# Web Push: kunci khusus produksi (php artisan webpush:vapid --show).
VAPID_SUBJECT="mailto:<email_admin_desa>"
VAPID_PUBLIC_KEY=<public_key_produksi>
VAPID_PRIVATE_KEY=<private_key_produksi>

# Peringatan bencana SIGAP: domain situs SIGAP untuk link_url (dari tim SIGAP).
SIGAP_LINK_HOSTS=<domain_sigap>

# Realtime (Laravel Reverb, service sid_reverb). null = mati (polling).
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=sid
REVERB_APP_KEY=<openssl rand -hex 16>
REVERB_APP_SECRET=<openssl rand -hex 16>
REVERB_HOST=sid_reverb
REVERB_PORT=8080
REVERB_SCHEME=http
# Kosong: browser memakai origin halaman (wss://<hostname_publik>/app/...).
REVERB_CLIENT_HOST=
REVERB_CLIENT_PORT=
REVERB_CLIENT_SCHEME=
REVERB_ALLOWED_ORIGINS=<hostname_publik>
REVERB_APP_MAX_CONNECTIONS=900
```

Cara mendapatkan nilainya:

- **Mailtrap Sending:** buka **Sending Domains**, tambahkan domain desa, pasang record DNS (SPF, DKIM, DMARC) sampai terverifikasi, lalu buat API token khusus produksi dengan akses **Sending** ke domain itu. Jangan pakai token dev. `FRONTEND_URL` harus URL publik HTTPS karena dipakai untuk tautan di email reset.
- **Reverb:** `REVERB_APP_KEY` dan `REVERB_APP_SECRET` dibuat sekali dengan `openssl rand -hex 16`. Key ikut terkirim ke browser (lewat `GET /api/realtime/config`), secret tidak. `REVERB_APP_MAX_CONNECTIONS=900` karena event loop bawaan Reverb hanya sanggup ±1.024 koneksi; browser yang ditolak kembali polling.
- **VAPID:** buat **sekali** dengan `php artisan webpush:vapid --show` (boleh di mesin lokal; `--show` hanya menampilkan, tidak menulis `.env`) dan simpan di secret manager. Jangan pakai ulang kunci dev, dan jangan ganti setelah rilis: semua langganan push lama jadi tidak berlaku dan pengguna harus mengaktifkan push ulang.

### B2. Env frontend (saat build)

Nilai `VITE_*` ditanam saat `npm run build`, bukan dibaca saat runtime; mengubahnya berarti build ulang.

**Minimal:**

```env
VITE_APP_NAME=SIDUTama
# Kosongkan bila SPA dan API satu origin (stack Docker): API memakai window.location.origin.
VITE_API_URL=
```

**Semua fitur** (tambahan):

```env
# Sama persis dengan VAPID_PUBLIC_KEY produksi.
VITE_VAPID_PUBLIC_KEY=<public_key_produksi>
```

> Image `sid-web` dari `apps/frontend/Dockerfile` saat ini dibangun tanpa `VITE_VAPID_PUBLIC_KEY`, sehingga push nonaktif di stack Docker walaupun `VAPID_*` diisi di `deploy/sid.env`. Untuk mengaktifkannya, Dockerfile dan workflow rilis perlu menerima kunci publik tersebut sebagai build argument.
>
> Realtime tidak butuh env frontend: alamat dan key Reverb dibaca saat runtime dari backend, jadi cukup isi `REVERB_*` di `deploy/sid.env`.

### B3. Deploy pertama

```bash
cp deploy/compose.env.example deploy/compose.env
cp deploy/sid.env.example deploy/sid.env
chmod 600 deploy/compose.env deploy/sid.env
# isi keduanya, lalu salah satu:
bash deploy/scripts/setup.sh <tag>           # desa sungguhan: DB kosong, hanya migrasi
bash deploy/scripts/setup.sh --demo <tag>    # staging/demo: + data demo (butuh SID_ROLE=demo)
```

`setup.sh` membangun image (5-15 menit pertama kali), menjalankan migrasi, menyalakan stack, lalu smoke test. Menjalankannya lagi hanya memastikan stack hidup; data tidak diubah.

Untuk desa sungguhan, pasang desa sekali setelah `setup.sh`. Password sementara Staf SIDUTama hanya tampil sekali, jadi simpan saat itu juga:

```bash
bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan sid:install \
  --village-name="Desa Sukamaju" --village-code=3201010001 \
  --district="Cibadak" --regency="Sukabumi" --province="Jawa Barat" --postal-code=43351 \
  --nik=3201012345670001 --name="Nama Petugas" --dob=1980-01-01 --gender=L --address="Alamat Petugas"
# opsional: --dusun="Nama Dusun" --rw=1 --rt=1 (wilayah Staf SIDUTama), --head-name="Nama Kepala Desa"
```

- **Desa sungguhan** (`SID_ROLE=production`, default template): jangan pakai data demo (`db:seed` dan seeder demo menolak `APP_ENV=production`). Desa, data acuannya, dan Staf SIDUTama pertama dipasang dengan `sid:install` di atas (penjelasan opsi di [`docs/SETUP.md`](docs/SETUP.md#pasang-desa-sungguhan-database-tanpa-data-demo)); perintah ditolak bila desa sudah ada. Wilayah lainnya dibuat Staf SIDUTama dari Kelola Wilayah.
- **Staging/demo** (`SID_ROLE=demo`): data diisi dari *golden dump* hasil seed demo (`deploy/backups/golden-*.dump`, dibuat `make-golden.sh`). Login dengan akun demo (`demo_admin`, dll.). Siapa pun yang tahu URL bisa login dengan kata sandi demo yang tercantum di repo, jadi batasi akses di reverse proxy.
- **Integrasi pihak ketiga** (Cimart, SIGAP): buat client sekali per aplikasi dengan `bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan integration:create ...` (lihat [`docs/SETUP.md`](docs/SETUP.md#integrasi-pihak-ketiga-cimart-sigap)), lalu serahkan domain production SID dan token ke tim Cimart/SIGAP lewat jalur aman. Penggantian dan pencabutan token berikutnya dari menu **Integrasi**.

### B4. Rilis baru dan operasional

```bash
git fetch --tags && git checkout <tag>
bash deploy/scripts/deploy.sh <tag> --build --migrate   # --migrate menampilkan migrasi pending lalu minta ketik ya
bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan sid:sync-reference-data --force   # data acuan dari rilis (jenis surat baru, template); aman diulang
bash deploy/scripts/deploy.sh <tag-sebelumnya> --no-pull # rollback manual (image lama masih ada)
```

`deploy.sh` memeriksa konfigurasi, membangun/menarik image (gagal = stack berjalan tidak disentuh), menjalankan migrasi, menyalakan stack, dan smoke test. Bila smoke gagal, skrip otomatis kembali ke tag sebelumnya. Tag aktif ada di `deploy/.state/current_tag`, sebelumnya di `previous_tag`, riwayat di `deploy.log`. Skrip tidak pernah menghapus volume (`down -v`). Entrypoint container menjalankan `config:cache`, jadi perubahan env baru berlaku setelah deploy ulang tag yang sama.

| Kebutuhan | Perintah |
| --- | --- |
| Status dan log | `bash deploy/scripts/lib.sh ps`, `bash deploy/scripts/lib.sh logs --tail 100 sid_api` (juga `sid_worker`, `sid_scheduler`, `sid_reverb`, `sid_web`) |
| Smoke test | `bash deploy/scripts/smoke.sh` (login ikut diuji bila `deploy/smoke.env` berisi `SID_SMOKE_USER`/`SID_SMOKE_PASS`; bila realtime aktif, handshake WebSocket `/app/` ikut dicek dan kegagalannya hanya **PERINGATAN**, bukan rollback) |
| Kembalikan data demo (hanya `SID_ROLE=demo`) | `bash deploy/scripts/reset-demo.sh` (`--check` hanya memeriksa syarat). Semua sesi keluar |
| Data acuan baru dari rilis (jenis surat baru, perubahan template/isian) | `bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan sid:sync-reference-data --force` setiap selesai deploy; pengaturan desa tidak ditimpa |
| Buat ulang golden dump (setelah migrasi/seed berubah) | `bash deploy/scripts/make-golden.sh` |
| Backup database | `docker exec sid_db pg_dump -U sid -d sid -Fc > sid_$(date +%Y%m%d).dump`; ikut cadangkan volume `public` dan `private` (berkas unggahan) |
| Staf SIDUTama lupa kata sandi | `bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan staf-sid:recover --username=<username> --force` (kata sandi sementara tampil sekali) |
| Uji email | `bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan mail:test <email_admin>`. Dengan `MAIL_MAILER=log`, tautan reset kata sandi hanya muncul di log `sid_api` |
| Push / notifikasi peringatan SIGAP gagal | `bash deploy/scripts/lib.sh exec -u www-data sid_worker php artisan queue:failed`, lalu `... queue:retry all` |

`sid_scheduler` dan `sid_worker` tidak punya healthcheck; cek status `Up` lewat `ps`. `sid_reverb` punya healthcheck (`GET /up` milik Reverb), tetapi deploy tidak menunggunya karena realtime opsional. Worker keluar sendiri tiap jam lalu dinyalakan ulang Docker, jadi uptime pendek itu normal.

**Mode Neon (fallback DB):** `bash deploy/scripts/deploy.sh <tag> --db neon` memakai `deploy/sid.neon.env` (host *pooled*, `DB_SSLMODE=require`); migrasi wajib lewat `DB_HOST_DIRECT`. Kembali dengan `--db local`. `reset-demo.sh` dan `make-golden.sh` selalu menolak mode neon. Mode ini belum teruji.

### B5. Pemecahan masalah

| Gejala | Kemungkinan penyebab | Tindakan |
| --- | --- | --- |
| Login gagal **419** / **401** padahal kredensial benar | `SANCTUM_STATEFUL_DOMAINS` tidak sama persis dengan hostname di browser; `APP_URL` salah; proxy tidak mengirim `X-Forwarded-Proto: https` atau tidak meneruskan `Host`; cookie `Secure` ditolak karena diakses lewat `http://` | Samakan hostname di `sid.env` lalu deploy ulang tag yang sama; cek proxy. Untuk akses lokal `http://localhost:<port>` saja, pakai `SESSION_SECURE_COOKIE=false` |
| **502** dari proxy | `sid_api` belum sehat atau mati | `lib.sh ps`, `lib.sh logs sid_api`, `lib.sh restart sid_api` |
| Proxy tidak terhubung sama sekali | `sid_web` mati atau port salah | `lib.sh ps`; `curl -i http://127.0.0.1:8100/healthz` |
| Halaman lama setelah deploy | Service worker PWA memegang versi lama | Muat ulang dua kali / tutup semua tab; bila perlu *Clear site data* |
| Gagal koneksi DB (`SQLSTATE[08006]`) | `sid_db` belum sehat; sandi berbeda dari saat volume dibuat | `lib.sh logs sid_db`. Mengubah `POSTGRES_PASSWORD` setelah volume dibuat tidak berlaku |
| `GAGAL: placeholder <...>` / `izin ... harus 600` | Konfigurasi belum lengkap | Perbaiki file yang disebut |
| `port is already allocated` | Bentrok port | `ss -ltnp \| grep 8100`; ganti `SID_HTTP_PORT` dan sesuaikan proxy |
| `operasi lain sedang berjalan (.state/lock ada)` | Skrip sebelumnya terhenti paksa | Pastikan tidak ada skrip berjalan, hapus `deploy/.state/lock/owner` lalu `rmdir deploy/.state/lock` |
| Notifikasi/surat tidak langsung berubah (baru setelah ±30 detik); console browser: `WebSocket connection ... failed` | Proxy tim tidak meneruskan WebSocket, `sid_reverb` mati, atau `REVERB_*` kosong | `curl -s https://<host>/api/realtime/config` (harus `"enabled":true`); `lib.sh logs sid_reverb`; cek header `Upgrade`/`Connection` di proxy. Sementara bisa `BROADCAST_CONNECTION=null` |
| `queue:failed` berisi `BroadcastEvent` | `sid_reverb` mati saat event dikirim | Hidupkan `sid_reverb`; job lama boleh dihapus (`queue:flush`) karena tampilan sudah disegarkan polling |
| Disk penuh | Image lama menumpuk | `docker system df`; hapus image SID lama satu per satu dengan `docker image rm <registry>/sid-api:<tag-lama>`. Jangan `prune` bila server dipakai sistem lain |

Sebelum dipakai warga sungguhan: pastikan `sid_worker` berjalan (push, dan seluruh notifikasi peringatan SIGAP), situs disajikan lewat HTTPS, dan uji email berhasil.

## Test dan pemeriksaan kode

```powershell
# Backend (memakai SQLite in-memory, tidak menyentuh database .env)
cd apps\backend
php artisan test
.\vendor\bin\pint --test

# Frontend
cd apps\frontend
npm run lint
npm run format:check
npm run typecheck
npm run test:run
npm run build
```

`npm run typecheck` (`tsc --noEmit`) wajib bersih; `npm run build` tidak memeriksa tipe. `npm run format` merapikan format semua file. CI menjalankan kelima perintah frontend ini.

## Perintah artisan khusus aplikasi

| Perintah | Kegunaan |
| --- | --- |
| `php artisan sid:install --village-name=... --village-code=... --nik=... [data staf] [--dusun= --rw= --rt=]` | Pasang desa pada instalasi baru: desa, data acuan, dan Staf SIDUTama pertama (ditolak bila desa sudah ada) |
| `php artisan sid:sync-reference-data [--force]` | Perbarui data acuan desa yang berjalan setelah rilis (jenis surat baru, template/isian) tanpa menimpa pengaturan desa |
| `php artisan staf-sid:first --nik=... [data citizen] [--rt=...]` | Bootstrap Staf SIDUTama pertama untuk desa yang sudah ada (ditolak bila sudah ada staf aktif) |
| `php artisan staf-sid:recover --username=... [--force]` | Pemulihan darurat bila Staf SIDUTama lupa kata sandi: kata sandi sementara, wajib ganti saat login, sesi lama dicabut, tercatat |
| `php artisan approvals:send-reminders` | Kirim pengingat approval yang jatuh tempo sekarang (normalnya otomatis lewat `schedule:work`) |
| `php artisan letters:backfill-snapshots` | Bekukan snapshot render untuk surat approved lama yang belum punya snapshot |
| `php artisan mail:test <email>` | Kirim email uji lewat mailer aktif (`MAIL_MAILER`), jalur yang sama dengan email reset kata sandi |
| `php artisan integration:create <slug> --name=... --abilities=...` | Buat client integrasi pihak ketiga (Cimart, SIGAP) beserta token pertamanya (ditampilkan sekali) |
| `php artisan integration:{enable,disable,rotate,tokens,revoke,abilities} <slug>` | Kelola client integrasi dari terminal (cadangan menu **Integrasi**); mengubah hak akses hanya lewat `integration:abilities` |
| `php artisan disaster-alerts:prune` | Hapus peringatan SIGAP yang berakhir lebih dari 30 hari (normalnya otomatis harian lewat `schedule:work`) |

## Konvensi penting

- Seluruh endpoint backend berada di `apps/backend/routes/api.php`; jadwal scheduler di `apps/backend/routes/console.php`; kontrak API di [`docs/api_spec/openapi.yaml`](docs/api_spec/openapi.yaml).
- Kode frontend dikelompokkan per domain di `src/features/`; halaman route berada di `src/pages/`.
- Request browser harus mengirim cookie (`withCredentials`) dan mengambil CSRF cookie Sanctum sebelum login.
- Identitas desa (nama, kontak, logo) berasal dari database dan dikelola lewat Kelola Profil Desa, bukan di-hardcode di frontend.
- Jangan memasukkan secret atau file `.env` ke Git. Jika menambah environment variable, tambahkan juga ke `.env.example` dan dokumentasikan perubahannya.

## Kontribusi

Gunakan branch dari `dev` dengan format `feature/deskripsi`, `fix/deskripsi`, atau `docs/deskripsi`. Buat pull request ke `dev`, pastikan lint/test relevan sudah dijalankan, lalu tunggu minimal satu approval sebelum *squash merge*. Jangan push langsung ke `main` atau `dev`.

## Dokumentasi

| Dokumen | Kegunaan |
| --- | --- |
| [`docs/SETUP.md`](docs/SETUP.md) | Panduan setup lokal (Windows) yang lebih rinci |
| [`docs/technical_design/TDD-01_Overview_Scope_Roles.md`](docs/technical_design/TDD-01_Overview_Scope_Roles.md) | Tujuan, ruang lingkup MVP, role, dan alur surat |
| [`docs/technical_design/TDD-02_UseCase_Descriptions.md`](docs/technical_design/TDD-02_UseCase_Descriptions.md) | Aturan bisnis dan use case |
| [`docs/technical_design/TDD-03_Database_Schema.md`](docs/technical_design/TDD-03_Database_Schema.md) | Skema data, enkripsi, dan strategi indexing |
| [`docs/technical_design/TDD-04_Security_NFR_Compliance.md`](docs/technical_design/TDD-04_Security_NFR_Compliance.md) | Keamanan, audit trail, kebutuhan nonfungsional, dan compliance |
| [`docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md`](docs/technical_design/TDD-05_Roadmap_Risks_OpenQuestions.md) | Roadmap, risiko, dan keputusan terbuka |
| [`docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md`](docs/architecture/SID-ARCH-SYS-001_System_Architecture_v1.1.md) | Titik masuk arsitektur sistem dan pemetaan RBAC |
| [`docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md`](docs/architecture/SID-ARCH-BE-001_Backend_Architecture.md) | Pola backend, pipeline, notifikasi, scheduler, dan audit trail |
| [`docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md`](docs/architecture/SID-ARCH-FE-001_Frontend_Architecture_v1.1.md) | Pola frontend, routing, API client, dan design system |
| [`docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md`](docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md) | Fitur yang terdokumentasi tetapi belum diimplementasi |
| [`docs/STRUKTUR_FOLDER.md`](docs/STRUKTUR_FOLDER.md) | Struktur dan aturan organisasi kode |
| [`docs/api_spec/00_INDEX.md`](docs/api_spec/00_INDEX.md) | Indeks spesifikasi API |
| [`docs/development/DEV-CODE-001_Code_Guidelines.md`](docs/development/DEV-CODE-001_Code_Guidelines.md) | Konvensi kode frontend dan automasi kualitas |
| [`docs/development/DEV-TEST-001_Testing.md`](docs/development/DEV-TEST-001_Testing.md) | Strategi serta cakupan pengujian |
| [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md) | Aturan branch, commit, PR, review, dan rilis |
| [`docs/Environment Standardization.md`](docs/Environment%20Standardization.md) | Aturan environment variable dan pengelolaan secret |
| [`docs/diagram/code/`](docs/diagram/code/) | Source PlantUML untuk use case, sequence, ERD, class, dan deployment |

## Batasan MVP

Modul aset dan keuangan desa, integrasi Dukcapil, WhatsApp Bot, blockchain penuh, notifikasi email status surat, serta editor dinamis tipe/template surat belum termasuk MVP. Rencana pengembangannya dicatat pada [appendix desain teknis](docs/technical_design/TDD-06_Appendix.md) dan [audit docs](docs/audit-docs/AUDIT_DOCS_BELUM_DIIMPLEMENTASI.md).
