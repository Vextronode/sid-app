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
| Nama file & komponen | `PascalCase`, nama file = nama komponen | `ApprovalStepRenderer.tsx` |
| Nama hook kustom | `camelCase`, diawali `use` | `usePipelineSteps.ts` |
| Ekstensi file | `.tsx` bila berisi JSX, selain itu `.ts`; file `.js`/`.jsx` baru tidak diterima di `src/` | `LetterTable.tsx`, `statusFlow.ts` |
| Tipe & interface | `PascalCase`; tipe props komponen bernama `{Komponen}Props` | `LetterTableProps`, `LetterRequest` |
| Nama variabel & fungsi | `camelCase` | `resolveApproverLabel()` |
| Nama constant | `UPPER_SNAKE_CASE` | `REJECT_CAPABLE` |
| Endpoint API (konsumsi di FE) | Mengikuti kontrak Backend, `kebab-case` plural | `/api/letter-requests` |

### A.2 Konvensi Komponen

1. Function component murni - tidak menggunakan class component pada kode baru.
2. **Batas ukuran:** komponen yang melebihi kurang lebih 150-200 baris menjadi sinyal wajib untuk dipecah - ekstrak logic ke custom hook, atau pecah menjadi sub-komponen dengan tanggung jawab lebih sempit.
3. **Larangan komponen per-role:** dilarang membuat komponen approval terpisah per role (`RTApprovalCard`, `RWApprovalCard`, dst.). Wajib menggunakan `ApprovalStepRenderer` generik (lihat `SID-ARCH-FE-001` S6).
4. Props diberi tipe TypeScript (`type {Komponen}Props`) di atas definisi komponen - bukan dibiarkan tanpa tipe (lihat A.8).
5. Satu komponen = satu tanggung jawab. Komponen presentational (menampilkan) dipisah dari komponen yang mengambil data (biasanya lewat custom hook `use{Feature}Data`).

### A.3 Konvensi Styling

1. **Dilarang** menulis nilai warna/style sebagai hex/arbitrary value langsung dalam className (mis. `bg-[#1F3864]` **tidak diperbolehkan**). Proyek memakai Tailwind CSS v4 (CSS-first, tanpa `tailwind.config.js`): token warna didefinisikan di `src/index.css` (`@theme static`, palet `pb-*`) dan variabel `--sid-*` di `src/styles/sid-global.css`.
2. Kombinasi kelas yang berulang dan kompleks diekstrak menjadi komponen kecil di `components/ui` atau konstanta kelas di fitur terkait - bukan `@apply` yang tersebar di banyak berkas CSS. (Utility `cn()`/clsx/tailwind-merge tidak terpasang di `package.json`.)
3. Skala spasi mengikuti skala bawaan Tailwind - hindari nilai custom/"angka ajaib" tanpa alasan desain yang terdokumentasi.

### A.4 Form Handling

1. Form pengajuan surat bersifat **schema-driven**, dibangun dari `letter_type.form_fields` dan `signature_slots` yang dikirim Backend (`DynamicSuratForm`, `features/surat/utils/letterFormData.ts`) - bukan satu komponen form React per jenis surat. Validasi akhir tetap di Backend (`LetterFormSchema`).
2. Validasi menggunakan **React Hook Form + Zod**.
3. Pesan kesalahan validasi ditampilkan dengan pola konsisten (posisi, warna) mengikuti design token status.

### A.5 State Management (aturan praktis)

1. Data dari API **wajib** lewat TanStack Query - dilarang menyimpan hasil `fetch` manual ke dalam `useState` sebagai pengganti cache.
2. `useMemo`/`useCallback` hanya digunakan ketika ada alasan performa yang jelas (komputasi berat, mencegah re-render anak yang mahal) - bukan default di setiap fungsi.
3. Rendering list wajib menggunakan `key` yang stabil (id data) - **dilarang** menggunakan index array sebagai `key` untuk data yang dapat berubah urutan/isi.

### A.6 Import Order

Urutan import: (1) pustaka eksternal, (2) modul internal lewat alias `@/` (`@/lib`, `@/shared/lib`, `@/components`, `@/features/...`), (3) import relatif dalam fitur yang sama - dipisahkan baris kosong antar kelompok.

### A.7 Linting, Formatting & Automasi

1. ESLint + Prettier wajib aktif, konfigurasi seragam (bukan preferensi individual kontributor).
2. Pre-commit hook (Husky + lint-staged) mencegah kode yang gagal lint/format masuk ke repository.
3. `npm run typecheck` (`tsc --noEmit`) memeriksa tipe; `npm run build` (Vite) tidak memeriksa tipe sama sekali. Typecheck wajib bersih dan dijalankan CI (job `frontend-ci`), tetapi tidak di pre-commit karena memeriksa seluruh proyek (sekitar 20 detik).
4. ESLint (`typescript-eslint` recommended) menolak `any` eksplisit (`no-explicit-any`) dan `@ts-ignore`/`@ts-nocheck` (`ban-ts-comment`) sebagai error.

### A.8 TypeScript

Source frontend sedang dimigrasi bertahap dari JavaScript. `noImplicitAny` dan `strictNullChecks` di `tsconfig.json` sudah aktif: parameter, props, dan state tanpa tipe ditolak typecheck, dan nilai yang mungkin `null`/`undefined` harus diperiksa sebelum dipakai. Flag `strict` lainnya belum aktif. Aturan berikut berlaku untuk kode baru dan kode yang sedang diubah:

1. Props komponen, parameter fungsi yang diekspor, dan nilai balik hook diberi tipe eksplisit.
2. Tipe data domain/API yang dipakai lintas fitur (user, surat, penduduk, wilayah, profil desa) disimpan di `src/types/`; tipe yang hanya dipakai satu fitur di `features/<fitur>/types.ts`. Bentuk tipe mengikuti kontrak di `docs/api_spec`.
3. Dilarang menambah `any`, `as any`, `@ts-ignore`, atau `@ts-nocheck` baru. Bila tipe memang belum diketahui, pakai `unknown` lalu persempit; bila terpaksa mengecualikan pemeriksaan, pakai `@ts-expect-error` disertai alasan.
4. State awal kosong diberi tipe (`useState<LetterRequest[]>([])`), bukan `useState([])` yang terbaca sebagai `never[]`.
5. Parameter opsional ditandai `?` atau diberi nilai default, agar pemanggil tidak dipaksa mengisi semua argumen.
6. `npm run typecheck` harus 0 error; CI menolak perubahan yang menambah error tipe.
7. Variabel tak terpakai diperiksa rule `@typescript-eslint/no-unused-vars` (bukan `no-unused-vars` bawaan, yang salah menandai nama parameter di tipe fungsi); komentar pengecualian memakai nama rule tersebut.
8. Store tingkat modul (mis. `shared/lib/toast.ts`, `shared/lib/dialog.ts`) mengekspor tipe datanya (`Toast`, `DialogEntry`) agar komponen host dan pemanggil memakai bentuk yang sama.
9. Test:
   - Fungsi hasil impor yang di-mock lewat `vi.mock` diakses dengan `vi.mocked(fn, { partial: true, deep: true })`, bukan `fn.mockReturnValue(...)` langsung.
   - Data uji yang hanya berisi sebagian field dibungkus `partialFixture<T>(...)` dari `src/test/fixtures.ts`; jangan menambah cast `as` di tiap test.
   - Helper test yang menerima data sebagian diberi tipe `DeepPartial<T>` (dari `src/test/fixtures.ts`) lalu meneruskannya lewat `partialFixture<T>(...)`.
   - Mock komponen yang tidak merender apa pun ditulis `(): null => null`.
   - Nilai yang wajib ada di test (elemen hasil `querySelector`/`closest`, hasil fungsi yang bisa `null`) dibungkus `present(...)` dari `src/test/fixtures.ts`, bukan non-null assertion `!`.
   - Elemen form diambil dengan tipe elemennya, mis. `getByRole<HTMLSelectElement>('combobox')`, `querySelector<HTMLElement>(...)`.
   - Properti yang memang tidak boleh ada diperiksa dengan `expect(obj).not.toHaveProperty('x')`.
10. Pesan galat API untuk pengguna diambil dengan `getApiErrorMessage(error, fallback)` dari `shared/lib/apiError.ts`; jangan menyalin helper serupa di tiap komponen.
11. Objek konstanta berisi nilai tetap ditulis `as const satisfies Record<string, T>` (mis. `SURAT_STATUS` terhadap `LetterStatus`) agar nilainya bertipe literal dan tetap diperiksa terhadap tipe domainnya.
12. Helper dan komponen yang menerima surat dari baris daftar maupun dari detail memakai tipe sempit berisi field yang dibaca saja, mis. `Partial<Pick<Letter, 'status' | 'expires_at'>>`, bukan `Letter` utuh.
13. Nilai yang mungkin `null` diperiksa dengan guard atau `?.`/`??`, tidak dengan non-null assertion `!`. Kunci peta yang mungkin kosong diperiksa dulu: `(key ? LABELS[key] : undefined) ?? fallback`.

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
| 1.2 | 2026-10-30 | Frontend TypeScript: konvensi ekstensi dan nama tipe, props bertipe (menggantikan JSDoc typedef), bagian A.8 TypeScript, `npm run typecheck`. |
