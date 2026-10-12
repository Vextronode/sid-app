# PANDUAN PENULISAN KODE (CODE GUIDELINES)
## SIDUTama Cibenda (Sistem Informasi Desa) - Program Capstone Cibenda

| Atribut Dokumen | Keterangan |
|---|---|
| Kode Dokumen | DEV-CODE-001 |
| Status | Berlaku (Aktif) - Versi 1.0 |
| Audiens | Seluruh Developer (Frontend & Backend), Reviewer |
| Sifat Dokumen | Aturan penulisan kode sehari-hari yang konkret dan dapat langsung diterapkan/diperiksa saat code review. Alasan struktural di baliknya ada di `SID-ARCH-FE-001`/`SID-ARCH-BE-001`. |

---

## BAGIAN A - FRONTEND

### A.1 Naming Convention

| Konteks | Konvensi | Contoh |
|---|---|---|
| Nama file & komponen | `PascalCase`, nama file = nama komponen | `ApprovalStepRenderer.jsx` |
| Nama hook kustom | `camelCase`, diawali `use` | `usePipelineSteps.js` |
| Nama variabel & fungsi | `camelCase` | `resolveApproverLabel()` |
| Nama constant | `UPPER_SNAKE_CASE` | `REJECT_CAPABLE` |
| Endpoint API (konsumsi di FE) | Mengikuti kontrak Backend, `kebab-case` plural | `/api/letter-requests` |

### A.2 Konvensi Komponen

1. Function component murni - tidak menggunakan class component pada kode baru.
2. **Batas ukuran:** komponen yang melebihi kurang lebih 150-200 baris menjadi sinyal wajib untuk dipecah - ekstrak logic ke custom hook, atau pecah menjadi sub-komponen dengan tanggung jawab lebih sempit.
3. **Larangan komponen per-role:** dilarang membuat komponen approval terpisah per role (`RTApprovalCard`, `RWApprovalCard`, dst.). Wajib menggunakan `ApprovalStepRenderer` generik (lihat `SID-ARCH-FE-001` S6).
4. Props didokumentasikan menggunakan **JSDoc typedef** di atas definisi komponen - bukan dibiarkan tanpa dokumentasi tipe.
5. Satu komponen = satu tanggung jawab. Komponen presentational (menampilkan) dipisah dari komponen yang mengambil data (biasanya lewat custom hook `use{Feature}Data`).

### A.3 Konvensi Styling

1. **Dilarang** menulis nilai warna/style sebagai hex/arbitrary value langsung dalam className (mis. `bg-[#1F3864]` **tidak diperbolehkan**). Seluruh warna dipetakan lewat `tailwind.config.js` yang meng-extend `sid-design-tokens.css`.
2. Kombinasi kelas Tailwind yang berulang dan kompleks diekstrak menggunakan utility `cn()` (clsx + tailwind-merge) - bukan `@apply` yang tersebar di banyak berkas CSS.
3. Skala spasi mengikuti skala bawaan Tailwind - hindari nilai custom/"angka ajaib" tanpa alasan desain yang terdokumentasi.

### A.4 Form Handling

1. Form pengajuan surat bersifat **schema-driven**, mengikuti `LetterType.applicant_category` dan field requirement dari Backend - bukan satu komponen form React per jenis surat.
2. Validasi menggunakan **React Hook Form + Zod**.
3. Pesan kesalahan validasi ditampilkan dengan pola konsisten (posisi, warna) mengikuti design token status.

### A.5 State Management (aturan praktis)

1. Data dari API **wajib** lewat TanStack Query - dilarang menyimpan hasil `fetch` manual ke dalam `useState` sebagai pengganti cache.
2. `useMemo`/`useCallback` hanya digunakan ketika ada alasan performa yang jelas (komputasi berat, mencegah re-render anak yang mahal) - bukan default di setiap fungsi.
3. Rendering list wajib menggunakan `key` yang stabil (id data) - **dilarang** menggunakan index array sebagai `key` untuk data yang dapat berubah urutan/isi.

### A.6 Import Order

Urutan import: (1) pustaka eksternal, (2) modul internal fitur lain melalui `/shared`, (3) import relatif dalam fitur yang sama - dipisahkan baris kosong antar kelompok.

### A.7 Linting, Formatting & Automasi

1. ESLint + Prettier wajib aktif, konfigurasi seragam (bukan preferensi individual kontributor).
2. Pre-commit hook (Husky + lint-staged) mencegah kode yang gagal lint/format masuk ke repository.

---

## BAGIAN B - BACKEND

### B.1 Struktur Layer dan Tanggung Jawab

Alur Backend wajib mengikuti: **Controller -> Service -> Repository -> Model**.

| Layer | Tanggung jawab | Tidak boleh dilakukan |
|---|---|---|
| Controller | Menerima HTTP request, memanggil service, dan mengembalikan HTTP response/resource. | Menulis business logic, query Eloquent, atau akses database langsung. |
| Service | Menjalankan business logic, otorisasi proses, orkestrasi beberapa repository, dan transaction bila diperlukan. | Menangani detail HTTP atau mengembalikan response JSON langsung. |
| Repository | Menjadi satu-satunya layer yang melakukan query Eloquent dan akses database melalui model. | Menyimpan business rule atau menangani HTTP request/response. |
| Model | Merepresentasikan entitas database, relasi Eloquent, casts, accessor/mutator, dan konfigurasi model. | Menjadi tempat business logic proses aplikasi yang kompleks. |

1. Controller melakukan dependency injection terhadap service yang diperlukan.
2. Service melakukan dependency injection terhadap repository yang diperlukan; service tidak memanggil model atau query Eloquent secara langsung.
3. Repository menggunakan model Eloquent untuk operasi baca/tulis database, eager loading, dan query scope.
4. Untuk proses yang melibatkan beberapa operasi tulis, transaction (`DB::transaction`) diletakkan pada service.
5. Akses model langsung di controller hanya diperbolehkan untuk route model binding pada parameter method; operasi setelahnya tetap didelegasikan ke service.

### B.2 Request Validation dan API Resource

1. Setiap endpoint yang menerima input wajib menggunakan **Form Request** di `app/Http/Requests`; controller memakai data dari `$request->validated()`.
2. Aturan validasi, otorisasi request, dan normalisasi input ditempatkan pada Form Request, bukan ditulis inline di controller.
3. Respons data API wajib menggunakan **Laravel API Resource** di `app/Http/Resources`, bukan mengembalikan model Eloquent secara langsung.
4. Endpoint yang mengembalikan satu entitas menggunakan `{Entity}Resource`; endpoint daftar/paginasi menggunakan `{Entity}Collection`.
5. Resource menentukan bentuk data API, termasuk relasi yang boleh diekspos. Field internal atau sensitif tidak boleh diteruskan ke client.

### B.3 Naming Convention

| Konteks | Konvensi | Contoh |
|---|---|---|
| Class PHP | `PascalCase` | `LetterService`, `LetterRepository` |
| Method, variabel, dan properti | `camelCase` | `getScopedLetters()` |
| Model | Bentuk tunggal (singular) | `Letter`, `LetterType` |
| Service dan repository | Nama model/fitur + akhiran layer | `CitizenService`, `CitizenRepository` |
| Form Request | Aksi + nama entitas + `Request` | `StoreLetterRequest`, `UpdateVillageProfileRequest` |
| Resource dan collection | Nama entitas + `Resource`/`Collection` | `LetterResource`, `LetterCollection` |

### B.4 Dokumentasi dan Kualitas Kode

1. Method publik pada service atau repository yang tidak langsung jelas dari signature-nya wajib diberi PHPDoc, khususnya untuk parameter array, tipe return, dan efek samping penting.
2. Gunakan type declaration untuk parameter, return type, dan properti bila tipe data telah diketahui.
3. Hindari duplikasi query dan business logic; ekstrak ke repository atau service sesuai tanggung jawabnya.
4. Setiap perubahan Backend wajib mempertahankan atau menambahkan test yang relevan pada `tests/Unit` dan/atau `tests/Feature`.

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Rancangan Awal |
| 1.1 | 2026-09-12 | Menambahkan pedoman struktur Backend, Form Request, API Resource, dan Resource Collection. |
