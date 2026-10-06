# Frontend Changelog — Auth & Approval Flow v5.1

Dokumen ini merangkum kontrak yang berubah pada backend SIDUTama Cibenda.
Endpoint login/registrasi/pemulihan memakai path web tanpa prefix `/api`;
endpoint profil, logout, dan bisnis memakai prefix `/api`. Permintaan mutasi SPA tetap
membutuhkan cookie sesi dan header CSRF `X-XSRF-TOKEN`.

## Login

Login menggunakan `username`, bukan email.

```http
POST /login
Content-Type: application/json
```

```json
{
  "username": "aminah.2518",
  "password": "********"
}
```

Respons `200` memasang cookie sesi Sanctum:

```json
{
  "message": "Login berhasil",
  "user": {
    "id": "uuid-user",
    "name": "Siti Aminah",
    "username": "aminah.2518",
    "email": null,
    "role": "warga",
    "is_active": true,
    "must_change_password": false,
    "citizen": {},
    "official": null
  }
}
```

Jika `is_active=false`, backend mengembalikan `403` dengan pesan
`Akun tidak aktif, hubungi administrator`.

## Register

Request hanya menerima NIK dan password; nama dan username diturunkan dari
data `citizens`, sementara username dibuat otomatis.

```http
POST /register
Content-Type: application/json
```

```json
{
  "nik": "3201012345670001",
  "password": "********",
  "password_confirmation": "********"
}
```

Respons `201` sekaligus memulai sesi pengguna:

```json
{
  "message": "Akun berhasil dibuat. Simpan username Anda.",
  "data": {
    "username": "siti.2518",
    "name": "Siti Aminah"
  }
}
```

Tampilkan username kepada warga sesudah registrasi agar dapat disimpan.
Kesalahan NIK tidak terdaftar dan NIK yang sudah terhubung ke akun masing-masing
mengembalikan `422` dengan pesan `NIK tidak terdaftar sebagai warga Desa
Cibenda` atau `NIK sudah terdaftar, silakan login`.

## Profil dan password

`PATCH /api/profile` mengubah username dan/atau email. Email boleh `null`.
Username dinormalisasi menjadi huruf kecil.

```json
{
  "username": "siti.2518",
  "email": "siti@example.test"
}
```

Respons membawa user terbaru pada properti `user`, termasuk username, role,
`must_change_password`, data citizen, dan official aktif.

`PUT /api/profile/password` mengubah password:

```json
{
  "current_password": "********",
  "password": "********",
  "password_confirmation": "********"
}
```

Jika user memperoleh password sementara dan `must_change_password=true`,
frontend harus memaksanya mengganti password. Endpoint lain ditolak dengan
`403`:

```json
{
  "message": "Anda harus mengganti password terlebih dahulu.",
  "code": "password_change_required"
}
```

Endpoint pengecualian selama status tersebut aktif: `GET /api/user`,
`PUT /api/profile/password`, dan `POST /api/logout`.

## Promote, demote, dan rotate jabatan

Pengelolaan jabatan akun dilakukan oleh Petugas Desa pada `/api/officials`.
Promote menggantikan pembuatan akun melalui endpoint users; akun warga sasaran
harus aktif, terhubung dengan citizen, dan belum mempunyai jabatan aktif.

```http
POST /api/officials/promote
```

```json
{
  "user_id": "uuid-user",
  "position": "rt",
  "rt_id": 12,
  "started_at": "2026-10-03",
  "term_ends_at": "2030-10-03",
  "phone_wa": "6281234567890",
  "notes": "Penetapan jabatan"
}
```

Respons `201` berupa resource official, termasuk `term_ends_at`.

```http
POST /api/officials/45/demote
```

```json
{
  "notes": "Akhir masa jabatan"
}
```

Respons demote memuat jabatan yang dinonaktifkan dan array `warnings`.
Warning hanya muncul bila surat aktif akan kehilangan approver:

```json
{
  "message": "Jabatan berhasil diturunkan.",
  "data": {
    "id": 45,
    "position": "rt",
    "is_active": false,
    "ended_at": "2026-10-03"
  },
  "warnings": [
    {
      "code": "letters_without_approver",
      "position": "rt",
      "count": 2,
      "message": "Terdapat surat aktif yang tidak lagi memiliki pejabat RT untuk diproses."
    }
  ]
}
```

Tidak adanya surat terdampak menghasilkan `warnings: []`. Petugas tidak dapat
menurunkan dirinya sendiri. Petugas aktif terakhir juga tidak dapat
dinonaktifkan.

```http
POST /api/officials/45/rotate
```

```json
{
  "user_id": "uuid-user-pengganti",
  "started_at": "2026-10-04",
  "term_ends_at": "2030-10-04",
  "notes": "Pergantian pejabat"
}
```

Request rotate tidak menerima `citizen_id`, `position`, atau kolom lingkup
wilayah; posisi dan lingkup dipertahankan dari official lama. Respons berisi
`data.old_official`, `data.new_official`, dan `warnings`. Rotasi
`petugas_desa` tidak didukung; gunakan promote/demote.

## Reset password oleh Petugas Desa

```http
POST /api/users/{user}/reset-password
```

Respons `200`:

```json
{
  "message": "Kata sandi sementara berhasil dibuat. Berikan kepada pengguna secara aman.",
  "temporary_password": "************"
}
```

Password sementara hanya dikirim sekali pada respons. User berikutnya wajib
mengubah password.

## Pengajuan dan daftar surat

Semua role yang mempunyai akun aktif dan `citizen_id` dapat mengajukan surat
untuk dirinya sendiri:

```http
POST /api/letters
```

Pemohon RT dapat melewati tahap RT miliknya; respons surat dapat menunjuk
`current_step_order` ke tahap 2. Pemohon tidak boleh menyetujui suratnya
sendiri. Untuk melihat surat sendiri tanpa bergantung pada role gunakan:

```http
GET /api/letters?scope=mine
```

Daftar surat memakai endpoint bersama `GET /api/letters`. Tanpa `scope=mine`,
scope mengikuti role: RT melihat surat wilayah RT; RW melihat riwayat wilayah
yang sudah disetujui RT; Kadus melihat surat dusunnya yang sudah melewati RT;
Kades/Sekdes melihat surat desa yang sudah melewati RT; Kasi/Kaur melihat
surat approved sesuai `assigned_role`; Petugas Desa melihat surat di desanya.
Semua role juga dapat memilih `scope=mine` untuk surat yang diajukan sendiri.

Daftar dan detail surat untuk semua role tetap menggunakan endpoint bersama:

- `GET /api/letters`
- `GET /api/letters/{id}`

Untuk Kasi/Kaur, daftar berisi surat `approved` di desa yang sesuai dengan
`assigned_role`. Nilai `assigned_role: null` berarti surat tersedia bagi Kasi
dan Kaur. Tidak ada endpoint keputusan untuk Kasi/Kaur; tombol approve/reject
harus dihilangkan.

## Dashboard

`GET /api/dashboard` menghasilkan bentuk sesuai role.

Dashboard Kasi/Kaur:

```json
{
  "data": {
    "role": "kasi_pelayanan",
    "total_surat_selesai": 23,
    "completed_letters": [
      {
        "id": "uuid-letter",
        "letter_type_name": "Surat Keterangan Domisili",
        "status": "approved",
        "current_step_order": 2,
        "is_overdue": false
      }
    ],
    "unread_notifications_count": 1
  }
}
```

`completed_letters` berisi paling banyak 20 surat terbaru yang sesuai role;
`total_surat_selesai` menghitung seluruh surat yang sesuai.

Dashboard Petugas Desa memuat ringkasan jumlah warga/surat dan:

```json
{
  "jabatan_lewat_masa": [
    {
      "id": 12,
      "position": "rt",
      "name": "Nama Pejabat",
      "term_ends_at": "2026-10-02"
    }
  ],
  "jabatan_segera_berakhir": []
}
```

Daftar kedua berisi jabatan aktif yang berakhir dalam 30 hari.

Dashboard Kades/Sekdes memuat `total_menunggu_approval` dan `pending_letters`;
surat yang diajukan oleh user dashboard tersebut tidak disertakan.

## Perubahan penting lainnya

- Masa berlaku PDF diterapkan kepada pemohon berdasarkan `submitted_by`, apa
  pun rolenya. Status surat tetap harus `approved`.
- PDF tetap memakai tanda tangan dan stempel Kepala Desa aktif, termasuk bila
  keputusan final dicatat oleh Sekdes.
- Approval flow hanya menerima posisi `rt` dan `kepala_desa`.
  Tepat satu tahap final harus berada pada `step_order` terbesar dengan posisi
  `kepala_desa`; keputusan dapat dicatat atas nama Kades atau Sekdes.
- Approval settings API hanya menampilkan/mengubah level approver `rt` dan
  `kepala_desa`.
