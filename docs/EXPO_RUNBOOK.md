# Runbook Pameran SID (expo)

Panduan operasional tim untuk menjalankan SID di laptop server selama pameran. Semua perintah dijalankan dari folder yang berisi `deploy/` di laptop server, dengan `bash` (bit eksekusi tidak dijamin setelah salin/unzip).

> **Status pengujian.** Skrip, Nginx, dan compose sudah diperiksa statis dan sebagian diuji perilakunya di mesin pengembang, **tetapi belum pernah dijalankan dengan Docker sungguhan, belum di laptop server, dan belum di GitHub Actions.** Bagian bertanda **[BELUM TERUJI]** wajib dibuktikan saat gladi H-3.

Ringkasan arsitektur: CI membangun image `sid-api` (PHP-FPM) dan `sid-web` (Nginx + SPA) dari tag git `vX.Y.Z` di `main` lalu mendorongnya ke GHCR. Laptop hanya menarik image berdasarkan tag. Stack: `sid_db` (PostgreSQL 18, mode local), `sid_api`, `sid_scheduler` (image `sid-api` yang menjalankan `schedule:work` untuk pengingat approval), `sid_web`. Satu-satunya port: `127.0.0.1:<SID_HTTP_PORT>` (default 8100). Proxy/tunnel tim (di host laptop) meneruskan HTTPS publik ke port itu.

---

## 0. Jalan cepat: satu perintah di PC ber-Docker

Syarat: Docker Desktop/Engine sudah berjalan, `bash` (Linux/macOS/WSL2, atau **Git Bash** di Windows), internet saat pertama kali (unduh image dasar + dependency saat build). Tidak perlu PHP, Composer, Node.js, Nginx, atau PostgreSQL di host.

1. Salin **seluruh folder repo** (bukan hanya `deploy/`) ke PC itu, **termasuk** `deploy/compose.env`, `deploy/sid.env`, `deploy/smoke.env` (berisi rahasia, tidak ada di git; salin lewat USB/scp, jangan lewat chat).
2. Dari root repo:
   ```bash
   bash deploy/scripts/setup-expo.sh
   ```
   Pertama kali: build image di PC itu (5-15 menit), migrasi, golden DB dari seed, isi DB demo, smoke test. Dijalankan lagi: hanya memastikan stack hidup (data tidak diubah). Setelah reboot, container naik sendiri bila Docker diatur start saat boot.
3. Buka `http://localhost:8100` di PC itu, atau URL publik lewat proxy/tunnel (bagian 2 langkah 5).

Versi baru: `bash deploy/scripts/deploy.sh <tag> --build` (rollback otomatis bila gagal).

**[BELUM TERUJI]** Alur ini baru diuji dengan Docker tiruan (urutan perintah, state, guard), belum dengan Docker sungguhan.

## 1. Prasyarat laptop server

- Docker Engine + **Docker Compose v2 ≥ 2.20** (`docker compose version`).
- `bash` (Linux, macOS, atau WSL2). Windows tanpa WSL tidak didukung.
- **Tidak perlu** memasang PHP, Composer, Node.js/npm, Nginx, maupun PostgreSQL di server: semuanya ada di dalam image (`sid-api`, `sid-web`, `postgres`) yang dibangun CI dan hanya di-pull. `curl` di host opsional: bila tidak ada, `smoke.sh` memakai container `curlimages/curl` (butuh `--network host`, yaitu Linux).
- Login GHCR dengan **classic PAT** berizin `read:packages` (token fine-grained belum mendukung paket). Bila organisasi memakai SSO: *Configure SSO → Authorize* untuk token itu.
  ```bash
  echo '<GHCR_PAT>' | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin
  ```
- Laptop: tidur/hibernasi **mati**, aksi tutup layar **tidak melakukan apa-apa**, charger terpasang, Docker **start saat boot** (Linux: `sudo systemctl enable docker`).
- Port yang dipakai CiMart di host yang sama: 8000, 8080, 3307, 6379. Jangan dipakai SID. Jangan pernah menjalankan `docker system prune`/`volume prune` di laptop ini (bisa menghapus milik CiMart).

## 2. Menyiapkan server pertama kali

1. Salin folder `deploy/` dari repo ke laptop (scp, USB, atau `git clone --filter=blob:none --sparse` + `git sparse-checkout set deploy`). Image tidak berisi skrip/compose.
2. Bila `compose.env`, `sid.env`, `smoke.env` sudah disiapkan tim (di-ignore git, tidak ikut repo), salin langsung ke `deploy/` di server lewat jalur aman (scp/USB, bukan chat), lalu `chmod 600 compose.env sid.env smoke.env` **di server** dan lanjut ke langkah 5. Bila belum, buat dari template dan kunci izinnya:
   ```bash
   cd deploy
   cp compose.env.example compose.env
   cp sid.env.example sid.env
   cp sid.neon.env.example sid.neon.env   # hanya bila Neon disiapkan sebagai cadangan
   chmod 600 compose.env sid.env sid.neon.env
   ```
3. Isi semua `<...>`:
   - `compose.env`: `SID_REGISTRY=ghcr.io/<owner huruf kecil>`, `SID_IMAGE_TAG=<tag pertama>`, `SID_HTTP_PORT=8100`.
   - `APP_KEY` dibuat **sekali** dan **tidak pernah diganti** (mengganti = semua sesi/cookie tidak valid). Pakai nilai yang sama di `sid.env` dan `sid.neon.env`. Tanpa openssl/PHP di server, buat lewat container:
     ```bash
     docker run --rm --entrypoint php ghcr.io/<owner>/sid-api:<tag> -r 'echo "base64:".base64_encode(random_bytes(32)), PHP_EOL;'
     ```
   - Sandi DB (alfanumerik): `docker run --rm --entrypoint php ghcr.io/<owner>/sid-api:<tag> -r 'echo bin2hex(random_bytes(24)), PHP_EOL;'`. Isi **sama** di `DB_PASSWORD` dan `POSTGRES_PASSWORD` (deploy menolak bila berbeda).
   - `APP_URL`/`FRONTEND_URL` = `https://<hostname publik>`; `SANCTUM_STATEFUL_DOMAINS` = hostname publik **tanpa** `https://`.
4. (Opsional, disarankan) `deploy/smoke.env` untuk uji login otomatis (`chmod 600`):
   ```
   SID_SMOKE_USER=demo_warga
   SID_SMOKE_PASS=<SANDI_AKUN_DEMO>
   ```
5. Proxy/tunnel tim (berjalan di host laptop) diarahkan ke `http://127.0.0.1:<SID_HTTP_PORT>` dan wajib: meneruskan header `Host` asli (hostname publik), mengirim `X-Forwarded-Proto: https` dan `X-Forwarded-For`, serta mengizinkan body ≥ 25 MB (unggahan sampai 24 MB). **[BELUM TERUJI]** dengan proxy tim yang sebenarnya.
6. Simpan salinan `compose.env`, `sid.env`, `sid.neon.env` di tempat aman tim (bukan di repo). File-file ini dan `.state/`, `backups/` sudah di-ignore oleh `deploy/.gitignore`.

## 3. Membuat rilis

1. Merge ke `main` (CI `SID CI` hijau).
2. Buat dan dorong tag dari `main`:
   ```bash
   git switch main && git pull
   git tag v1.0.0 && git push origin v1.0.0
   ```
3. Pantau Actions → **SID Release**. Workflow menolak tag yang bukan leluhur `origin/main` atau berformat salah. Ringkasan job memuat referensi image (`v1.0.0` dan `sha-xxxxxxx`) beserta digest. Tidak ada tag `latest`.
4. **Dry-run** (tanpa push): Actions → SID Release → *Run workflow*, `push=false`. Untuk image percobaan yang benar-benar di-push, `push=true` hanya diizinkan dengan tag berlabel (mis. `v0.1.0-rc1`).
5. Arsitektur: default `linux/amd64,linux/arm64` (arm64 lewat QEMU, lambat). Bila laptop pasti x86_64, set variabel repo `SID_PLATFORMS=linux/amd64`.

**[BELUM TERUJI]** Workflow belum pernah berjalan di GitHub. Lakukan dry-run dulu.

## 4. Deploy

```bash
bash deploy/scripts/deploy.sh <tag> [--build] [--migrate] [--yes] [--no-pull] [--db local|neon]
```

- `--build`: bangun image di mesin ini dari source repo (tanpa GHCR/CI/PAT; butuh repo lengkap + internet). Tanpa `--build`, image di-pull dari GHCR.
- Deploy pertama (belum ada `.state/current_tag`, mode local) menjalankan migrasi otomatis tanpa konfirmasi.

- **Deploy pertama** (DB kosong): `bash deploy/scripts/deploy.sh v1.0.0 --migrate`
- Deploy berikutnya tanpa perubahan skema: `bash deploy/scripts/deploy.sh v1.0.1`
- Dengan migrasi: tambah `--migrate`. Skrip menampilkan migrasi pending lalu meminta Anda mengetik `ya`. **Selama freeze (H-7 dst.) migrasi hanya boleh aditif.**

Urutan kerja skrip: preflight (izin 600, tidak ada `<...>`, format tag, `POSTGRES_*` = `DB_*`) → `pull` (gagal = berhenti, stack berjalan tidak disentuh) → migrasi opsional → `up -d --remove-orphans` → tunggu sehat → `smoke.sh`.

Arti keluaran:

| Keluaran | Arti | Tindakan |
|---|---|---|
| `DEPLOY OK: vX (mode local)` exit 0 | Berhasil, smoke lulus | Tidak ada |
| `GAGAL: pull gagal; stack yang berjalan TIDAK disentuh` | Tag salah / belum login GHCR / internet | Cek tag di GHCR, `docker login ghcr.io` |
| `deploy vX gagal; ROLLBACK ke vY berhasil` exit 1 | Versi baru rusak, versi lama sudah jalan lagi | Lihat log, laporkan ke tim dev |
| `deploy vX gagal DAN rollback ke vY gagal` exit 2 | Darurat | Lihat bagian 8, Insiden |
| `GAGAL: placeholder <...> belum diganti` / `izin ... harus 600` | Konfigurasi belum lengkap | Perbaiki file yang disebut |

Rollback **manual** = deploy ulang tag sebelumnya: `bash deploy/scripts/deploy.sh <tag-sebelumnya>`. Tag berjalan ada di `deploy/.state/current_tag`, sebelumnya di `deploy/.state/previous_tag`, riwayat di `deploy/.state/deploy.log`. Skrip **tidak pernah** menghapus volume (`down -v`).

Perintah compose harian (sudah memakai tag dan mode DB aktif):

```bash
bash deploy/scripts/lib.sh ps
bash deploy/scripts/lib.sh logs --tail 100 sid_api
bash deploy/scripts/lib.sh restart sid_api
bash deploy/scripts/smoke.sh
```

Staf aplikasi lupa kata sandi: `bash deploy/scripts/lib.sh exec -u www-data sid_api php artisan staf-sid:recover --username=<username> --force`, lalu serahkan kata sandi sementara yang tercetak (hanya tampil sekali).

Scheduler (pengingat approval tiap 5 menit, pembersihan log aktivitas harian) tidak punya healthcheck; cek dengan `ps` (status `Up`) dan `logs --tail 50 sid_scheduler`. Uji manual: `bash deploy/scripts/lib.sh exec -u www-data sid_scheduler php artisan approvals:send-reminders`.

## 5. Golden DB dan reset demo

- **Membuat golden** (setelah deploy pertama, dan setiap kali migrasi/seed berubah):
  ```bash
  bash deploy/scripts/make-golden.sh            # memakai tag yang sedang berjalan
  bash deploy/scripts/make-golden.sh --tag v1.0.0
  ```
  Membangun DB sementara dari seed segar (DB aplikasi tidak disentuh), menghasilkan `deploy/backups/golden-<tag>-<waktu>.dump` + `.sha256` + `.meta`, dan menandainya sebagai golden aktif (`backups/golden-current`). **Salin ketiga berkas ke luar laptop** (flashdisk/cloud tim).
- **Reset ke golden**:
  ```bash
  bash deploy/scripts/reset-demo.sh --check     # hanya cek syarat, tidak mengubah apa pun
  bash deploy/scripts/reset-demo.sh             # minta ketik RESET
  bash deploy/scripts/reset-demo.sh --yes       # tanpa konfirmasi (syarat tetap dicek)
  ```
  Syarat (tidak bisa dilewati): `SID_ROLE=expo`, `DB_HOST=sid_db`, mode DB local, dump + checksum cocok, `sid_db` sehat dan milik proyek ini. Alur: hentikan `sid_api` & `sid_scheduler` → drop + buat ulang DB → restore → nyalakan keduanya → smoke.
  Efek: **semua pengguna ter-logout** dan **lockout login (throttle) terbuka**, karena tabel `sessions`/`cache` kosong. Data yang dibuat pengunjung hilang. File unggahan di volume tidak dihapus.

**[BELUM TERUJI]** `make-golden.sh` dan `reset-demo.sh` belum pernah dijalankan terhadap PostgreSQL sungguhan.

## 6. Mode Neon (fallback)

Pakai hanya bila DB lokal bermasalah dan tidak cepat pulih (mis. disk rusak). Instance expo bukan produksi desa: data sintetis.

- Beralih: `bash deploy/scripts/deploy.sh <tag> --db neon` (memakai `sid.neon.env`; `sid_db` tidak dipakai). Kembali: `bash deploy/scripts/deploy.sh <tag> --db local`.
- Runtime memakai host **pooled** (`-pooler`) dengan `DB_SSLMODE=require`. Migrasi **wajib** lewat host **direct**: isi `DB_HOST_DIRECT`; `deploy.sh <tag> --db neon --migrate` memakainya otomatis.
- **Seed ulang Neon sekali** setelah zona waktu berubah ke `Asia/Jakarta` (timestamp lama bergeser ±7 jam). Jalankan saat mode neon aktif. Perintah ini **menghapus semua data di DB Neon itu**:
  ```bash
  bash deploy/scripts/lib.sh run --rm --no-deps -e APP_ENV=local -e DB_HOST=<NEON_DIRECT_HOST> sid_api php artisan migrate:fresh --seed --force
  ```
- `reset-demo.sh` dan `make-golden.sh` **selalu menolak** mode neon.
- Batas Neon Free: compute disuspend saat kuota bulanan habis. Cek dashboard Neon sebelum hari-H.

**[BELUM TERUJI]** Mode neon, kompatibilitas PgBouncer transaction mode, dan perintah seed ulang di atas.

## 7. Protokol pameran

**H-7 — freeze.** Hanya perbaikan kritis. Migrasi hanya aditif. Tag kandidat (`vX.Y.Z-rc.N`) diuji di laptop.

**H-3 — gladi di perangkat booth sungguhan lewat hotspot.** Deploy pertama (`--migrate`), `make-golden.sh`, `reset-demo.sh`, lalu dari perangkat booth: login warga tanpa 419/401; cookie sesi ber-flag `Secure; HttpOnly; SameSite=Lax` (DevTools → Application → Cookies); ajukan surat, lacak status, unduh/cetak PDF; logout; refresh di rute dalam tetap jalan; deploy tag kedua lalu pastikan perangkat mendapat versi baru (pembaruan PWA); uji rollback; uji internet putus + hotspot cadangan; reboot laptop dan pastikan stack naik sendiri.

**H-1.**
1. Tag final dibuat dan di-deploy: `bash deploy/scripts/deploy.sh vX.Y.Z` (smoke OK).
2. Image sudah ter-pull (deploy sudah melakukannya; tidak butuh internet untuk restart).
3. `bash deploy/scripts/make-golden.sh` lalu salin dump + `.sha256` + `.meta` ke luar laptop.
4. Catat tag final dan nama dump golden di catatan booth.

**Pagi hari-H.**
1. `bash deploy/scripts/lib.sh ps`: tiga container `healthy`.
2. `bash deploy/scripts/smoke.sh` (dengan `smoke.env` terisi; lewat URL publik: `SID_SMOKE_URL=https://<hostname publik> bash deploy/scripts/smoke.sh`).
3. `bash deploy/scripts/reset-demo.sh`, ketik `RESET`.
4. **Warm-up**: buka aplikasi, login, buka/unduh **satu PDF surat** (PDF pertama setelah container baru lambat karena dompdf membangun cache font).
5. Di setiap perangkat booth: hapus data situs dan *unregister* service worker (Chrome: DevTools → Application → Storage → *Clear site data*), lalu buka ulang URL publik.
6. Uji alur warga dari satu perangkat booth: login → ajukan surat → lihat status → logout.

**Selama pameran.**
- Pantau: `bash deploy/scripts/lib.sh ps`, `bash deploy/scripts/lib.sh logs --tail 50 sid_api`.
- Pemandu **logout** setelah setiap pengunjung (tidak ada idle logout otomatis).
- Bila data demo berantakan saat sepi: `bash deploy/scripts/reset-demo.sh` (semua sesi keluar).

**Insiden (urutan eskalasi).**
1. Satu layanan bermasalah: `bash deploy/scripts/lib.sh restart sid_api` (atau `sid_web` / `sid_scheduler`), lalu `bash deploy/scripts/smoke.sh`.
2. Versi baru bermasalah: `bash deploy/scripts/deploy.sh <tag-sebelumnya>`.
3. Data rusak: `bash deploy/scripts/reset-demo.sh`.
4. Internet/hotspot putus: pindah ke hotspot cadangan; proxy/tunnel tim harus tersambung ulang (**[BELUM TERUJI]**).
5. DB lokal tidak pulih: mode Neon (bagian 6).
6. Rencana terakhir: putar rekaman demo.

## 8. Pemecahan masalah

| Gejala | Kemungkinan penyebab | Tindakan |
|---|---|---|
| Login gagal **419** / **401** padahal kredensial benar | `SANCTUM_STATEFUL_DOMAINS` tidak sama persis dengan hostname di browser; `APP_URL` salah; proxy tidak mengirim `X-Forwarded-Proto: https` atau tidak meneruskan header `Host` asli; cookie `Secure` ditolak karena situs diakses lewat `http://` | Samakan hostname di `sid.env`, deploy ulang tag yang sama; cek konfigurasi proxy; selalu akses lewat `https://` |
| Login **422** "terlalu banyak percobaan" | Throttle login | Tunggu, atau `reset-demo.sh` (mengosongkan cache) |
| **502** dari proxy/Nginx | `sid_api` belum sehat atau mati | `bash deploy/scripts/lib.sh ps`, `logs sid_api`; `restart sid_api` |
| Proxy tidak bisa terhubung sama sekali | `sid_web` mati atau port salah | `ps`; `curl -i http://127.0.0.1:8100/healthz` di laptop |
| Halaman lama setelah deploy | Service worker PWA masih memegang versi lama | Muat ulang dua kali / tutup semua tab; bila perlu *Clear site data* (bagian 7) |
| PDF lambat (sekali) | dompdf membangun cache font setelah container baru | Normal; lakukan warm-up pagi hari |
| `sid_api` restart terus, log `APP_KEY kosong` / `DB_... kosong` | File env tidak lengkap | Lengkapi `sid.env`, deploy ulang |
| Gagal koneksi DB (`SQLSTATE[08006]`) | `sid_db` belum sehat; sandi berbeda dari saat volume dibuat; Neon disuspend | `ps`; `logs sid_db`. **Mengubah `POSTGRES_PASSWORD` setelah volume dibuat tidak berlaku**: sandi lama tetap dipakai DB |
| Disk penuh | Image lama menumpuk | `docker system df` (hanya melihat). Hapus image SID lama satu per satu: `docker image rm ghcr.io/<owner>/sid-api:<tag-lama>`. **Jangan** `prune` (resource CiMart) |
| `port is already allocated` | Bentrok port | `ss -ltnp \| grep 8100` (Linux) / `lsof -i :8100` (macOS); ganti `SID_HTTP_PORT` (bukan 8000/8080/3307/6379), sesuaikan proxy |
| `operasi lain sedang berjalan (.state/lock ada)` | Skrip sebelumnya terhenti paksa | Pastikan tidak ada skrip berjalan, lalu `rmdir deploy/.state/lock` (hapus `owner` di dalamnya dulu) |

## 9. Risiko yang diterima (keputusan untuk pameran)

- Tidak ada idle logout: pemandu wajib logout antar pengunjung.
- Registrasi publik tetap aktif, tetapi tautannya tidak dibagikan.
- Akun demo memakai sandi default dari seeder (data dummy).
- Notifikasi memakai polling 5 detik; web push tidak aktif di image expo.
- Temuan audit lain ditunda (lihat dokumen audit tim).

**Semua poin di atas wajib ditinjau ulang sebelum soft launch dengan warga sungguhan.** Jangan memakai instance atau database pameran untuk data warga.
