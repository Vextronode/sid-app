<?php

use App\Enums\UserRole;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\ApprovalFlowController;
use App\Http\Controllers\Api\ApprovalSettingController;
use App\Http\Controllers\Api\CitizenController;
use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FamilyController;
use App\Http\Controllers\Api\FamilySocioeconomicController;
use App\Http\Controllers\Api\HamletController;
use App\Http\Controllers\Api\InfoPageController;
use App\Http\Controllers\Api\KadesApprovalController;
use App\Http\Controllers\Api\LetterAttachmentController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterDownloadController;
use App\Http\Controllers\Api\LetterFulfillmentController;
use App\Http\Controllers\Api\LetterResultController;
use App\Http\Controllers\Api\LetterSignatureController;
use App\Http\Controllers\Api\LetterTypeController;
use App\Http\Controllers\Api\NewsCategoryController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OccupationController;
use App\Http\Controllers\Api\OfficialController;
use App\Http\Controllers\Api\OfficialPositionTypeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PublicPageController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\RegulationController;
use App\Http\Controllers\Api\RtApprovalController;
use App\Http\Controllers\Api\RtController;
use App\Http\Controllers\Api\RwController;
use App\Http\Controllers\Api\SignatureRequestController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserPhotoController;
use App\Http\Controllers\Api\UserSignatureController;
use App\Http\Controllers\Api\VillageOrgMemberController;
use App\Http\Controllers\Api\VillageOrgPositionController;
use App\Http\Controllers\Api\VillageProfileController;
use App\Models\VillageOrgPosition;
use App\Support\InfoPageFields;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes (UC-16 - tanpa login)
|--------------------------------------------------------------------------
*/

Route::prefix('public')->group(function () {
    Route::get('/home', [PublicPageController::class, 'home']);
    Route::get('/village-profile', [PublicPageController::class, 'villageProfile']);
    Route::get('/village-orgs/{orgType}', [PublicPageController::class, 'villageOrganization'])
        ->whereIn('orgType', VillageOrgPosition::ORG_TYPES);
    Route::get('/news', [PublicPageController::class, 'newsList']);
    Route::get('/letter-types', [PublicPageController::class, 'letterTypeList']);
    Route::get('/regulations', [PublicPageController::class, 'regulationList']);
    Route::get('/contact-us', [PublicPageController::class, 'contactUs']);
    Route::get('/info-pages/{page}', [PublicPageController::class, 'infoPage'])
        ->whereIn('page', array_keys(InfoPageFields::PAGES));
});

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
| EV5-6-S2: role-check RBAC dipasang per-grup lewat middleware `role:...`
| (alias EnsureUserHasRole, lihat bootstrap/app.php). Middleware ini
| HANYA mengecek users.role terhadap daftar role yang diizinkan endpoint.
| Context check per-resource (wilayah RT, current_step_order surat, dst)
| TETAP di Service/Policy masing-masing (LetterPolicy, OfficialPolicy,
| RtApprovalService::decision(), dst) — tidak dipindah ke sini.
|
| Grup tanpa `role:` (hanya `auth:sanctum`) berarti endpoint tersebut
| memang lintas-role dengan scoping data dilakukan di dalam Service
| (mis. GET /letters, GET /dashboard/*, GET /notifications) — bukan
| berarti lupa diproteksi.
*/

Route::middleware(['auth:sanctum', 'account.active', 'password.changed'])->group(function () {

    /*
    |----------------------------------------------------------------------
    | Auth Token in Future: token-based auth (API) dipisah dari session-based auth (web)
    |----------------------------------------------------------------------
    */

    /*
    |----------------------------------------------------------------------
    | Current User
    |----------------------------------------------------------------------
    | Lintas-role: setiap user login berhak melihat datanya sendiri.
    */
    Route::get('/user', [CurrentUserController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    // Anggota KK pemohon untuk isian family_members di form surat.
    Route::get('/profile/family-members', [ProfileController::class, 'familyMembers']);
    // Nama otomatis dari NIK di form surat (mis. saksi); dibatasi agar
    // tidak dipakai menebak NIK.
    Route::get('/profile/nik-lookup', [ProfileController::class, 'lookupNik'])->middleware('throttle:30,1');
    // Foto profil akun warga; akun yang menjabat ditolak (foto pejabat
    // dikelola Petugas Desa).
    Route::post('/profile/photo', [UserPhotoController::class, 'storeOwn']);
    Route::delete('/profile/photo', [UserPhotoController::class, 'destroyOwn']);

    // Tanda tangan pribadi akun: diisi sekali, tidak dapat diubah sendiri.
    Route::get('/profile/signature', [UserSignatureController::class, 'show']);
    Route::post('/profile/signature', [UserSignatureController::class, 'store']);
    Route::get('/profile/signature/image', [UserSignatureController::class, 'image']);

    // Permintaan tanda tangan yang ditujukan ke akun ini (pemilik NIK).
    Route::get('/signature-requests', [SignatureRequestController::class, 'index']);
    Route::post('/signature-requests/{signatureRequest}/accept', [SignatureRequestController::class, 'accept']);
    Route::post('/signature-requests/{signatureRequest}/reject', [SignatureRequestController::class, 'reject']);
    Route::get('/signature-blocks', [SignatureRequestController::class, 'blocks']);
    Route::delete('/signature-blocks/{signatureBlock}', [SignatureRequestController::class, 'unblock']);

    /*
    |----------------------------------------------------------------------
    | Approval Flows
    |----------------------------------------------------------------------
    | Hanya baca untuk Petugas Desa. Semua tipe surat memakai satu flow
    | RT -> Kepala Desa/Sekdes yang diset developer lewat seeder; tidak
    | ada endpoint tulis.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('approval-flows')
        ->group(function () {
            Route::get('/', [ApprovalFlowController::class, 'index']);
            Route::get('/{id}', [ApprovalFlowController::class, 'show']);
        });

    /*
    |----------------------------------------------------------------------
    | Approval Settings (UC-22)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('approval-settings')
        ->group(function () {
            Route::get('/', [ApprovalSettingController::class, 'index']);
            Route::patch('/{id}', [ApprovalSettingController::class, 'update']);
        });

    /*
    |----------------------------------------------------------------------
    | Citizens (UC-09)
    |----------------------------------------------------------------------
    | Petugas Desa dan Kasi Pemerintahan (pemegang layanan kependudukan /
    | Pelayanan Desa) boleh create/update/delete/import data kependudukan.
    | Kaur TU & Umum hanya membaca daftar warga dan KK sebagai bahan
    | pertimbangan; perubahan data olehnya hanya lewat surat
    | (POST /letters/{letter}/fulfillment).
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid, UserRole::KasiPemerintahan, UserRole::KaurTuUmum))
        ->get('/citizens', [CitizenController::class, 'index']);

    Route::middleware(UserRole::middleware(UserRole::StafSid, UserRole::KasiPemerintahan))
        ->prefix('citizens')
        ->group(function () {
            Route::post('/', [CitizenController::class, 'store']);
            Route::post('/import', [CitizenController::class, 'import']);
            Route::get('/import-template', [CitizenController::class, 'importTemplate']);
            //            Route::put('/{citizen}', [CitizenController::class, 'update']);
            Route::patch('/{citizen}', [CitizenController::class, 'update']);
            Route::delete('/{citizen}', [CitizenController::class, 'destroy']);
            Route::get('/wilayah', [CitizenController::class, 'wilayah']);
        });

    /*
    |----------------------------------------------------------------------
    | Families / Kartu Keluarga (UC-09 sub-flow)
    |----------------------------------------------------------------------
    | Sama seperti Citizens: Petugas Desa dan Kasi Pemerintahan mengelola,
    | Kaur TU & Umum hanya membaca.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid, UserRole::KasiPemerintahan, UserRole::KaurTuUmum))
        ->prefix('families')
        ->group(function () {
            Route::get('/', [FamilyController::class, 'index']);
            Route::get('/options', [FamilyController::class, 'options']);
            Route::get('/{id}/socioeconomic', [FamilySocioeconomicController::class, 'show']);
            Route::get('/{family}', [FamilyController::class, 'show']);
        });

    Route::middleware(UserRole::middleware(UserRole::StafSid, UserRole::KasiPemerintahan))
        ->prefix('families')
        ->group(function () {
            Route::post('/', [FamilyController::class, 'store']);
            Route::put('/{id}/socioeconomic', [FamilySocioeconomicController::class, 'upsert']);
            Route::patch('/{family}', [FamilyController::class, 'update']);
            Route::delete('/{family}', [FamilyController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | Log Aktivitas (S-05): riwayat data warga & KK dan status surat desa
    |----------------------------------------------------------------------
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('activity-logs')
        ->group(function () {
            Route::get('/population', [ActivityLogController::class, 'population']);
            Route::get('/letters', [ActivityLogController::class, 'letters']);
        });

    // Daftar pekerjaan aktif juga dipakai pemohon surat untuk isian
    // bertipe pekerjaan; kelola katalog tetap khusus Staf SID.
    Route::get('/occupations', [OccupationController::class, 'index']);

    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('occupations')
        ->group(function () {
            Route::post('/', [OccupationController::class, 'store']);
            Route::patch('/{id}', [OccupationController::class, 'update']);
            Route::delete('/{id}', [OccupationController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | Dashboard (UC-15)
    |----------------------------------------------------------------------
    | Statistik widget dashboard. Angka kartu surat diambil dari
    | /letters/summary; grafik letter-stats memakai scope yang sama
    | (LetterService::scopedQuery). Scoping per role dilakukan di
    | DashboardService, bukan lewat middleware role.
    */
    Route::prefix('dashboard')->group(function () {
        Route::get('/gender-stats', [DashboardController::class, 'genderStats']);
        Route::get('/letter-stats', [DashboardController::class, 'letterStats']);
    });

    // Pilihan Dusun -> RW -> RT desa untuk isian wilayah di form surat
    // (semua peran); kelola wilayah tetap khusus Staf SID di bawah.
    Route::get('/village-areas', [HamletController::class, 'areas']);

    /*
    |----------------------------------------------------------------------
    | Regions: Hamlets / RTs / RWs (UC-20)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))->group(function () {
        Route::prefix('hamlets')->group(function () {
            Route::get('/', [HamletController::class, 'index']);
            Route::post('/', [HamletController::class, 'store']);
            Route::patch('/{hamlet}', [HamletController::class, 'update']);
            Route::delete('/{hamlet}', [HamletController::class, 'destroy']);
        });

        Route::prefix('rts')->group(function () {
            Route::get('/', [RtController::class, 'index']);
            Route::post('/', [RtController::class, 'store']);
            Route::patch('/{rt}', [RtController::class, 'update']);
            Route::delete('/{rt}', [RtController::class, 'destroy']);
        });

        Route::prefix('rws')->group(function () {
            Route::get('/', [RwController::class, 'index']);
            Route::post('/', [RwController::class, 'store']);
            Route::patch('/{rw}', [RwController::class, 'update']);
            Route::delete('/{rw}', [RwController::class, 'destroy']);
        });
    });

    /*
    |----------------------------------------------------------------------
    | Letters (UC-03, UC-05, UC-06, UC-08)
    |----------------------------------------------------------------------
    */
    // Lintas-role: dipakai warga saat submit (pilih jenis surat) dan
    // Petugas Desa saat konfigurasi. ?include_inactive=1 (semua jenis
    // termasuk Draft/Nonaktif) khusus Petugas Desa - IndexLetterTypeRequest.
    Route::get('/letter-types', [LetterTypeController::class, 'index']);

    // UC-21: edit konfigurasi tipe surat eksklusif Petugas Desa.
    // PUT (bukan PATCH) mengikuti backlog - beda dari api_spec yang
    // menulis PATCH untuk endpoint ini.
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->put('/letter-types/{letterType}', [LetterTypeController::class, 'update']);

    Route::prefix('letters')->group(function () {
        // Authorization to submit is handled by LetterPolicy::create.
        Route::post('/', [LetterController::class, 'store']);

        // RW dan Kadus membaca surat wilayahnya (yang sudah di-approve RT)
        // lewat endpoint ini; scoping di LetterService::getScopedLetters()
        // dan LetterPolicy::view.
        Route::get('/', [LetterController::class, 'index']);
        // Angka ringkasan atas scope yang sama dengan daftar di atas.
        Route::get('/summary', [LetterController::class, 'summary']);
        // Laporan Excel atas scope dan filter yang sama dengan daftar.
        Route::get('/export', [LetterController::class, 'export']);
        Route::get('/{id}', [LetterController::class, 'show']);
        Route::delete('/{letter}', [LetterController::class, 'destroy']);
        //        Route::patch('/{letter}/resubmit', [LetterController::class, 'resubmit']);
        Route::get('/{letter}/download', [LetterDownloadController::class, 'download']);
        Route::get('/{letter}/attachments/{attachment}', [LetterAttachmentController::class, 'show']);

        // Terapkan perubahan data setelah final approve (Kasi/Kaur yang
        // ditugaskan, atau Petugas Desa sebagai cadangan) - LetterPolicy::fulfill.
        // Dokumen pendukung yang digenerate sistem dari isian form; dapat
        // di-preview maupun diunduh (?download=1) oleh siapa pun yang
        // berhak melihat suratnya.
        Route::get('/{letter}/supporting-document', [LetterDownloadController::class, 'supportingDocument']);

        // Pemohon mengisi ulang slot tanda tangan pihak lain.
        Route::post('/{letter}/signatures/{slot}', [LetterSignatureController::class, 'store']);

        // Hasil dari instansi luar setelah formulir pelayanan terbit: pemohon
        // mengunggah (LetterPolicy::uploadResult), Kasi/Kaur yang ditugaskan
        // atau Petugas Desa memverifikasi (LetterPolicy::reviewResult).
        // Berkasnya dibuka lewat /{letter}/attachments/{attachment}.
        Route::post('/{letter}/results', [LetterResultController::class, 'store']);
        Route::patch('/{letter}/results/{result}', [LetterResultController::class, 'update']);

        Route::get('/{letter}/fulfillment', [LetterFulfillmentController::class, 'show']);
        Route::post('/{letter}/fulfillment', [LetterFulfillmentController::class, 'store']);

        // Catatan refactor: sebelumnya closure inline yang langsung
        // memanggil PdfService, sekarang lewat
        // LetterDownloadController::preview() agar konsisten dengan
        // pola controller -> service.
        Route::get('/{letter}/preview', [LetterDownloadController::class, 'preview'])
            ->name('letters.preview');
    });

    /*
    |----------------------------------------------------------------------
    | News (UC-19)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa (SID-ARCH-SYS-001 S2.3 - domain CMS tidak
    | meluas ke Kades/Sekdes meski satu "Tier" navigasi).
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('news')
        ->group(function () {
            Route::get('/', [NewsController::class, 'index']);
            Route::post('/', [NewsController::class, 'store']);
            Route::patch('/{id}', [NewsController::class, 'update']);
            Route::delete('/{id}', [NewsController::class, 'destroy']);
        });

    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('news-categories')
        ->group(function () {
            Route::get('/', [NewsCategoryController::class, 'index']);
            Route::post('/', [NewsCategoryController::class, 'store']);
            Route::patch('/{id}', [NewsCategoryController::class, 'update']);
            Route::delete('/{id}', [NewsCategoryController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | Notifications
    |----------------------------------------------------------------------
    | Lintas-role: setiap user melihat notifikasinya sendiri
    | (NotificationService::getForUser scoped by notifiable_id = user login).
    */
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/read-all', [NotificationController::class, 'readAll']);
        Route::post('/{id}/read', [NotificationController::class, 'read']);
    });

    /*
    |----------------------------------------------------------------------
    | Push Subscriptions (Web Push)
    |----------------------------------------------------------------------
    | Lintas-role: setiap user mengelola langganan push miliknya sendiri
    | (device/browser saat ini). Dipanggil frontend setelah
    | PushManager.subscribe() berhasil (store) atau saat user menonaktifkan
    | notifikasi push di browser (destroy).
    */
    Route::prefix('push-subscriptions')->group(function () {
        Route::post('/', [PushSubscriptionController::class, 'store']);
        Route::delete('/', [PushSubscriptionController::class, 'destroy']);
    });

    // Route::prefix('official')->group(function () {
    //     Route::post('/signature', [OfficialController::class, 'uploadSignature']);
    //     Route::get('/signature', [OfficialController::class, 'getSignature']);
    // });

    /*
    |----------------------------------------------------------------------
    | Village Regulations (UC-24)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('regulations')
        ->group(function () {
            Route::get('/', [RegulationController::class, 'index']);
            Route::post('/', [RegulationController::class, 'store']);
            Route::patch('/{id}', [RegulationController::class, 'update']);
            Route::delete('/{id}', [RegulationController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | Pengumuman beranda & Halaman Informasi
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa. Satu pengumuman per desa (PUT menggantikan).
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))->group(function () {
        Route::get('/announcement', [AnnouncementController::class, 'show']);
        Route::put('/announcement', [AnnouncementController::class, 'save']);
        Route::delete('/announcement', [AnnouncementController::class, 'destroy']);

        Route::get('/info-pages', [InfoPageController::class, 'index']);
        Route::put('/info-pages/{page}', [InfoPageController::class, 'update'])
            ->whereIn('page', array_keys(InfoPageFields::PAGES));
    });

    /*
    |----------------------------------------------------------------------
    | RT Approvals (UC-04a - Tahap 1)
    |----------------------------------------------------------------------
    | Daftar/detail surat dibaca lewat /letters; section ini hanya untuk
    | aksi decision. Context check wilayah tetap di RtApprovalService.
    */
    Route::middleware(UserRole::middleware(UserRole::Rt))
        ->prefix('rt')
        ->group(function () {
            Route::patch('/letters/{letter}/decision', [RtApprovalController::class, 'decision']);
        });

    /*
    |----------------------------------------------------------------------
    | Kades Approvals (UC-04c)
    |----------------------------------------------------------------------
    | Diakses oleh official position 'kepala_desa' ATAU
    | 'sekretaris_desa' — keduanya saling menggantikan (first-action-wins),
    | lihat docblock KadesApprovalService dan SID-ARCH-BE-001 S3.3.
    | Status keputusan ini masih rekomendasi/asumsi default (belum
    | keputusan final eksplisit dari desa) - lihat
    | TDD-05_Roadmap_Risks_OpenQuestions Section 3.1. Daftar/detail
    | surat dibaca lewat /letters; section ini hanya untuk aksi decision.
    */
    Route::middleware(UserRole::middleware(UserRole::KepalaDesa, UserRole::SekretarisDesa))
        ->prefix('kades')
        ->group(function () {
            Route::patch('/letters/{letter}/decision', [KadesApprovalController::class, 'decision']);
        });

    /*
    |----------------------------------------------------------------------
    | Officials
    |----------------------------------------------------------------------
    | Fondasi CRUD data pejabat/petugas desa (RT, RW, Kasi, dll — termasuk
    | Kadus sebagai jabatan struktural non-approval, lihat TDD-01 §3).
    | Role-check di sini SENGAJA dilonggarkan ke seluruh role
    | authenticated - context check granular (siapa boleh apa) tetap
    | didelegasikan ke OfficialPolicy lewat $this->authorize() di
    | OfficialController (MANAGER_ROLES: staf_sid). Ini contoh sah:
    | Policy tetap dipertahankan sebagai
    | defense-in-depth kedua di belakang middleware yang lebih permisif,
    | bukan duplikasi peran.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('officials')
        ->group(function () {
            Route::post('/{official}/signature', [OfficialController::class, 'uploadSignature']);
            Route::get('/{official}/signature', [OfficialController::class, 'signaturePreview']);
            Route::post('/{official}/photo', [OfficialController::class, 'uploadPhoto']);
            Route::delete('/{official}/photo', [OfficialController::class, 'destroyPhoto']);
            Route::post('/promote', [OfficialController::class, 'promote']);
            // Cari calon pejabat lewat NIK (POST agar NIK tidak tercatat di URL).
            Route::post('/candidates/lookup', [OfficialController::class, 'candidate']);
            Route::get('/', [OfficialController::class, 'index']);
            Route::post('/', [OfficialController::class, 'store']);
            Route::get('/{official}', [OfficialController::class, 'show']);
            Route::patch('/{official}', [OfficialController::class, 'update']);
            Route::post('/{official}/demote', [OfficialController::class, 'demote']);
            Route::post('/{official}/rotate', [OfficialController::class, 'rotate']);
            Route::delete('/{official}', [OfficialController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | Users (UC-14)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa (Kelola User & Role).
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('users')
        ->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/{user}/reset-password', [UserController::class, 'resetPassword']);
            Route::post('/{user}/signature/reset', [UserSignatureController::class, 'reset']);
            Route::post('/{user}/photo', [UserPhotoController::class, 'store']);
            Route::delete('/{user}/photo', [UserPhotoController::class, 'destroy']);
            Route::patch('/{user}', [UserController::class, 'update']);
            Route::patch('/{user}/toggle-status', [UserController::class, 'updateStatus']);
        });

    /*
    |----------------------------------------------------------------------
    | Villages: Profile (UC-18)
    |----------------------------------------------------------------------
    | show(): lintas-role, dipakai halaman mana pun yang perlu tampilkan
    | identitas desa. update(): EKSKLUSIF Petugas Desa - ditegaskan
    | ulang di SID-ARCH-SYS-001 S2.3, Kepala Desa & Sekretaris Desa
    | TIDAK memiliki akses ke domain CMS meski keduanya approver aktif
    | di domain Surat-Menyurat.
    */
    Route::prefix('villages')->group(function () {
        Route::get('/profile', [VillageProfileController::class, 'show']);

        Route::middleware(UserRole::middleware(UserRole::StafSid))->group(function () {
            Route::patch('/profile', [VillageProfileController::class, 'update']);
            // Titik kantor dari link Google Maps (server membuka link Google).
            Route::post('/profile/resolve-map-link', [VillageProfileController::class, 'resolveMapLink'])
                ->middleware('throttle:10,1');
            Route::post('/profile/stamp', [VillageProfileController::class, 'uploadStamp']);
            Route::get('/profile/stamp', [VillageProfileController::class, 'stampPreview']);
            // Tampilan halaman publik (logo di header, foto di beranda).
            Route::post('/profile/logo', [VillageProfileController::class, 'uploadImage'])
                ->defaults('column', 'logo');
            Route::post('/profile/hero-image', [VillageProfileController::class, 'uploadImage'])
                ->defaults('column', 'hero_image');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Jenis Jabatan Desa Tanpa Akun
    |--------------------------------------------------------------------------
    | Eksklusif Petugas Desa. Jabatan yang punya akun tetap di enum
    | OfficialPosition dan tidak dikelola dari sini.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('official-position-types')
        ->group(function () {
            Route::get('/', [OfficialPositionTypeController::class, 'index']);
            Route::post('/', [OfficialPositionTypeController::class, 'store']);
            Route::patch('/{id}', [OfficialPositionTypeController::class, 'update']);
            Route::delete('/{id}', [OfficialPositionTypeController::class, 'destroy']);
        });

    /*
    |--------------------------------------------------------------------------
    | Village Org (Organisasi Non-Struktural: BPD/BUMDES/LPM/Karang Taruna/PKK)
    |--------------------------------------------------------------------------
    | UC-23. Eksklusif Petugas Desa. Jabatan (village_org_positions) berupa
    | slot tetap Ketua/Wakil Ketua/Anggota yang dibuat otomatis, jadi hanya
    | bisa dibaca; anggota (village_org_members) dikelola lewat route nested
    | sesuai api_spec paths/village-org/*.yaml.
    */
    Route::middleware(UserRole::middleware(UserRole::StafSid))
        ->prefix('village-org-positions')
        ->group(function () {
            Route::get('/', [VillageOrgPositionController::class, 'index']);
            Route::get('/{id}', [VillageOrgPositionController::class, 'show']);

            Route::post('/{position}/members', [VillageOrgMemberController::class, 'store']);
            Route::patch('/{position}/members/{id}', [VillageOrgMemberController::class, 'update']);
            Route::post('/{position}/members/{id}/end', [VillageOrgMemberController::class, 'end']);
            Route::post('/{position}/members/{id}/photo', [VillageOrgMemberController::class, 'uploadPhoto']);
            Route::delete('/{position}/members/{id}/photo', [VillageOrgMemberController::class, 'destroyPhoto']);
            Route::delete('/{position}/members/{id}', [VillageOrgMemberController::class, 'destroy']);
        });
});
