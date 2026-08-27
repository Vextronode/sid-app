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

*(Placeholder - menunggu pengisian oleh tim Backend, mengikuti format yang sama dengan Bagian A: Naming Convention spesifik PHP/Laravel, konvensi struktur Controller/Service, konvensi dokumentasi (PHPDoc), dan aturan static analysis jika ada - mis. PHPStan/Larastan.)*

---

## Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | - | Rancangan Awal |
