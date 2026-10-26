---
tags:
  - dev
  - laravel
  - react
  - setup
  - sanctum
date: 2026-10-18
---

# Setup Project

Panduan clone dan menjalankan project di lokal. Command ditulis untuk **Windows (PowerShell/CMD)**. macOS/Linux hampir sama, bedanya di cara menyalin file `.env` (`cp`, bukan `copy`).

Untuk menjalankan stack Docker expo (bukan pengembangan lokal), lihat [`EXPO_RUNBOOK.md`](EXPO_RUNBOOK.md).

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

Folder `deploy/` berisi docker compose dan skrip untuk stack expo.

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

```env
# Nama aplikasi yang tampil ke pengguna; samakan dengan VITE_APP_NAME di frontend.
SID_APP_NAME=SIDUTama

APP_TIMEZONE=Asia/Jakarta

# Pesan validasi dan error API berbahasa Indonesia (lang/id).
APP_LOCALE=id
APP_FALLBACK_LOCALE=id
APP_FAKER_LOCALE=id_ID

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sidutama
DB_USERNAME=postgres
DB_PASSWORD=isi_password_postgresql_anda

# Port dev Vite (npm run dev) = 5173.
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173

SESSION_DRIVER=file
QUEUE_CONNECTION=database
CACHE_STORE=file
```

> `.env.example` default-nya menunjuk ke `vite preview` (`FRONTEND_URL=http://127.0.0.1:4173`). Untuk `npm run dev`, ganti ke baris port 5173 yang di-comment di `.env.example` (seperti contoh di atas). `FRONTEND_URL` dan `SANCTUM_STATEFUL_DOMAINS` harus cocok dengan host + port frontend yang benar-benar dibuka di browser. Kalau beda, login gagal dengan error `419` atau `401 Unauthenticated`.

### Variabel `.env` penting lainnya

| Variabel | Fungsi | Catatan |
|---|---|---|
| `SID_APP_NAME` | Nama aplikasi untuk pengguna: judul login, `<title>`, manifest PWA, dan label peran staf ("Staf {nama}") | Default `SIDUTama`. Samakan dengan `VITE_APP_NAME` |
| `APP_LOCALE`, `APP_FALLBACK_LOCALE`, `APP_FAKER_LOCALE` | Bahasa pesan validasi (`lang/id/validation.php`), pesan bawaan framework (`lang/id.json`, `lang/id/*.php`), email reset kata sandi, dan data palsu factory/seeder | Wajib `id`, `id` dan `id_ID` (sudah begitu di `.env.example`; `phpunit.xml` memaksa `APP_LOCALE` dan `APP_FALLBACK_LOCALE` = `id` untuk test). Nilai `en` membuat pesan validasi kembali berbahasa Inggris. Setelah mengubah, jalankan `php artisan config:clear` |
| `QUEUE_CONNECTION` | Cara mengirim pekerjaan antrean (Web Push) | `database` = diantrekan, butuh `queue:work`; `sync` = langsung dikirim tanpa worker. Lihat bagian 3 |
| `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Kunci Web Push | Buat dengan `php artisan webpush:vapid`. Kosong = push nonaktif, in-app tetap jalan |
| `SESSION_DRIVER` | Penyimpanan sesi | `file` untuk lokal. Dengan `database`, `staf-sid:recover` juga menghapus sesi DB staf |
| `MAIL_MAILER` | Email | `log`; notifikasi email status surat belum diimplementasi |

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
| Staf aplikasi (`staf_sid`, "Staf SIDUTama") | `demo_admin` | Satu-satunya staf aplikasi desa demo |
| Warga | `demo_warga` | Kepala keluarga di RT 001/RW 001 Patrol |
| Warga | `demo_warga2` | Istri `demo_warga`, satu KK (mis. untuk mencoba saksi/TTD antar-warga) |
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
| RW lain | `rw.<dusun>.<nn>`, mis. `rw.sucen.03` |
| RT lain | `rt.<dusun>.<nn>.<nn>` (RW lalu RT), mis. `rt.cibenda.02.05` |

**Password semua akun:** `Password123!`

Akun dan identitas tersebut hanya untuk development/testing. Seeder demo menolak berjalan di environment `production`. Untuk mengganti data demo lama, gunakan `migrate:fresh --seed` hanya pada database yang boleh dihapus; menjalankan `db:seed` sendiri tidak menghapus data lama.

### Staf aplikasi pertama (database tanpa data demo)

Staf aplikasi (`staf_sid`) pertama diinisialisasi langsung pada database yang belum memiliki staf aktif. Untuk citizen baru, berikan data wajib citizen sesuai form dashboard, UUID desa, dan ID RT:

```powershell
php artisan staf-sid:first --nik=3201012345670001 --name="Nama Petugas" --dob=1980-01-01 --gender=L --address="Alamat Petugas" --village="<UUID_DESA>" --rt=1
```

Ganti `--rt=1` dengan ID RT yang benar-benar ada di desa tersebut. Jika citizen sudah ada, cukup berikan `--nik`; command akan membuat akun atau mempromosikan akun warga yang terhubung. Username dibuat otomatis dan password sementara acak hanya ditampilkan sekali. Akun wajib menggantinya saat login pertama. Command menolak jika staf aplikasi aktif sudah ada, jadi pada database demo gunakan `demo_admin`.

Staf aplikasi hanya **satu per desa**; penggantinya diproses lewat Rotasi di halaman Pejabat Desa (boleh oleh staf itu sendiri). Label perannya mengikuti `SID_APP_NAME` / `VITE_APP_NAME`, default "Staf SIDUTama".

### Pemulihan staf aplikasi yang lupa kata sandi

`staf-sid:first` bukan command pemulihan. Staf aplikasi tidak bisa mereset kata sandinya sendiri dari aplikasi, jadi bila lupa, jalankan di server:

```powershell
php artisan staf-sid:recover --username=<username_staf>
```

Command meminta konfirmasi (tambahkan `--force` untuk eksekusi non-interaktif), hanya berlaku untuk akun `staf_sid` aktif yang memegang jabatan aktif, mencetak kata sandi sementara sekali, mewajibkan ganti kata sandi saat login, mengeluarkan semua sesi dan token lama, dan tercatat di activity log. Bila login terkunci karena 5 kali gagal, kunci terbuka sendiri dalam 1 jam. Pergantian pemegang jabatan tetap lewat Rotasi.

---

## 3. Menjalankan Backend

Jalankan di `apps\backend`, masing-masing di **terminal terpisah** dan biarkan terbuka:

| Terminal | Perintah | Fungsi | Wajib? |
|---|---|---|---|
| 1 | `php artisan serve` | API di `http://localhost:8000` | Ya |
| 2 | `php artisan schedule:work` | Scheduler: tiap 5 menit menjalankan `approvals:send-reminders`, tiap menit `announcements:prune`, tiap hari `activitylog:clean` | Untuk pengingat approval |
| 3 | `php artisan queue:work` | Worker antrean: mengirim **semua** Web Push | Untuk push browser (bila `QUEUE_CONNECTION=database`) |

```powershell
php artisan serve
php artisan schedule:work
php artisan queue:work
```

### Kenapa ada scheduler?

Pengingat approval dipicu oleh **waktu**, bukan oleh klik pengguna. `schedule:work` berjalan terus dan tiap 5 menit memeriksa surat yang sisa waktunya sudah tinggal `reminder_hours` sebelum deadline. Bila ada, satu pengingat dikirim ke approver tahap itu (sekali per tahap per surat, dicatat di `reminded_at`). Bila tidak ada, ia diam. Jadwalnya diatur di `routes/console.php`; perintah ini tidak perlu diketik manual. Untuk uji cepat tanpa menunggu 5 menit:

```powershell
php artisan approvals:send-reminders
```

### Kenapa ada worker antrean?

Notifikasi surat dikirim lewat dua jalur: **in-app** (lonceng) ditulis langsung ke database dan selalu masuk, sedangkan **Web Push** harus menghubungi layanan push browser di internet.

- `QUEUE_CONNECTION=database` (default lokal dan stack Docker): push dicatat dulu di tabel `jobs`, lalu dikirim `queue:work` di belakang layar. Tombol Ajukan/Setujui tetap cepat. Tanpa worker, push tertahan (lonceng tetap masuk) dan langsung terkirim saat worker dinyalakan. Di Docker, worker berjalan otomatis di service `sid_worker`.
- `QUEUE_CONNECTION=sync`: push dikirim saat itu juga di dalam request, tanpa worker. Lebih praktis untuk lokal, tetapi tombol menunggu push selesai.

Cek push yang gagal: `php artisan queue:failed`; coba lagi: `php artisan queue:retry all`.

> Setelah mengubah kode backend atau `.env`, matikan (Ctrl+C) lalu jalankan ulang `schedule:work` dan `queue:work`, karena keduanya memuat kode sekali di awal.

### Notifikasi Web Push (opsional)

Notifikasi in-app berjalan tanpa konfigurasi tambahan. Untuk push browser:

1. `php artisan webpush:vapid` lalu isi `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` di `apps/backend/.env`.
2. Isi `VITE_VAPID_PUBLIC_KEY` di `apps/frontend/.env` dengan nilai `VAPID_PUBLIC_KEY` yang sama.
3. Jalankan `queue:work` (atau pakai `QUEUE_CONNECTION=sync`).

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
VITE_API_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000/api

# Samakan dengan SID_APP_NAME di backend.
VITE_APP_NAME=SIDUTama

# Harus sama dengan VAPID_PUBLIC_KEY di apps/backend/.env (kosong = push nonaktif).
VITE_VAPID_PUBLIC_KEY=
```

> `.env.example` frontend memakai `127.0.0.1`. Pilih satu host (`localhost` atau `127.0.0.1`) dan pakai konsisten di `VITE_API_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, dan alamat yang dibuka di browser; mencampur keduanya membuat cookie sesi tidak terkirim.

Frontend jalan di `http://localhost:5173`. Setelah mengubah `.env` frontend, restart `npm run dev`.

---

## 5. Auth Cookie-based, Bukan Bearer Token

Project pakai **Laravel Sanctum SPA authentication** - session/cookie based, bukan token di localStorage.

- Jangan simpan token di `localStorage` atau `sessionStorage`
- Axios instance di `src/lib/api.js` sudah di-setup `withCredentials: true`
- Sebelum login, wajib panggil `GET /sanctum/csrf-cookie` dulu, baru `POST /login`
- Setelah login, cookie session otomatis terkirim di setiap request — tidak perlu manual attach header

Contoh flow login:
```js
import api from '@/lib/api';

async function login(username, password) {
  await api.get('/sanctum/csrf-cookie');
  const { data } = await api.post('/api/login', { username, password });
  const user = data.user;
  return user;
}
```

---

## 6. Test & Pemeriksaan Kode

```powershell
# Backend: memakai SQLite in-memory (phpunit.xml), tidak menyentuh database di .env
cd apps\backend
php artisan test
.\vendor\bin\pint --test

# Frontend
cd apps\frontend
npm run lint
npm run test:run
npm run build
```

> Jangan menjalankan `php artisan migrate` manual untuk "mengecek" migration: perintah itu memakai database di `.env`. Cukup jalankan test.

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
| Perubahan kode tidak berefek di push/pengingat | Worker/scheduler memakai kode lama | Restart `queue:work` dan `schedule:work` |
| Staf aplikasi lupa kata sandi | Staf tidak bisa mereset dirinya sendiri | `php artisan staf-sid:recover --username=...` |

---

## Cek Cepat Tanpa Frontend

Bisa pakai curl (Git Bash/WSL) atau Postman dengan cookie jar aktif untuk test backend saja. Detail command curl bisa ditanyakan ke tim backend.
[[STRUKTUR_FOLDER]]
