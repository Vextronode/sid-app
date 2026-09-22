<?php

use App\Enums\UserRole;
use App\Http\Controllers\Api\ApprovalFlowController;
use App\Http\Controllers\Api\ApprovalSettingController;
use App\Http\Controllers\Api\CitizenController;
use App\Http\Controllers\Api\CitizenSocioeconomicController;
use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FamilyController;
use App\Http\Controllers\Api\HamletController;
use App\Http\Controllers\Api\KadesApprovalController;
use App\Http\Controllers\Api\KasiApprovalController;
use App\Http\Controllers\Api\LetterCategoryController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterDownloadController;
use App\Http\Controllers\Api\LetterTypeController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OfficialController;
use App\Http\Controllers\Api\PublicPageController;
use App\Http\Controllers\Api\RegulationController;
use App\Http\Controllers\Api\RtApprovalController;
use App\Http\Controllers\Api\RtController;
use App\Http\Controllers\Api\RwApprovalController;
use App\Http\Controllers\Api\RwController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VillageOrgMemberController;
use App\Http\Controllers\Api\VillageOrgPositionController;
use App\Http\Controllers\Api\VillageProfileController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Auth Routes
|--------------------------------------------------------------------------
*/

require __DIR__.'/auth.php';

/*
|--------------------------------------------------------------------------
| Public Routes (UC-16 - tanpa login)
|--------------------------------------------------------------------------
*/

Route::prefix('public')->group(function () {
    Route::get('/home', [PublicPageController::class, 'home']);
    Route::get('/village-profile', [PublicPageController::class, 'villageProfile']);
    Route::get('/news', [PublicPageController::class, 'newsList']);
    Route::get('/letter-types', [PublicPageController::class, 'letterTypeList']);
    Route::get('/regulations', [PublicPageController::class, 'regulationList']);
    Route::get('/contact-us', [PublicPageController::class, 'contactUs']);
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

Route::middleware('auth:sanctum')->group(function () {

    /*
    |----------------------------------------------------------------------
    | Auth
    |----------------------------------------------------------------------
    */
    Route::post('/logout', [AuthenticatedSessionController::class, 'logout']);

    /*
    |----------------------------------------------------------------------
    | Current User
    |----------------------------------------------------------------------
    | Lintas-role: setiap user login berhak melihat datanya sendiri.
    */
    Route::get('/user', [CurrentUserController::class, 'show']);

    /*
    |----------------------------------------------------------------------
    | Approval Flows (Epic 4 - Config over Code)
    |----------------------------------------------------------------------
    | Konfigurasi pipeline approval: eksklusif Petugas Desa
    | (SID-ARCH-BE-001 S3.4, S4.1 - domain konfigurasi bukan milik
    | Kades/Sekdes meski keduanya approver aktif di domain surat).
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('approval-flows')
        ->group(function () {
            Route::get('/', [ApprovalFlowController::class, 'index']);
            Route::post('/', [ApprovalFlowController::class, 'store']);
            Route::get('/{id}', [ApprovalFlowController::class, 'show']);
            Route::put('/{id}/steps', [ApprovalFlowController::class, 'replaceSteps']);
        });

    /*
    |----------------------------------------------------------------------
    | Approval Settings (UC-22)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa.
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('approval-settings')
        ->group(function () {
            Route::get('/', [ApprovalSettingController::class, 'index']);
            Route::patch('/{id}', [ApprovalSettingController::class, 'update']);
        });

    /*
    |----------------------------------------------------------------------
    | Citizens (UC-09)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa - Human-in-the-Loop principle
    | (SID-ARCH-BE-001 S5.3): hanya Petugas Desa yang boleh
    | create/update/delete data kependudukan.
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('citizens')
        ->group(function () {
            Route::get('/', [CitizenController::class, 'index']);
            Route::post('/', [CitizenController::class, 'store']);
            Route::patch('/{citizen}', [CitizenController::class, 'update']);
            Route::delete('/{citizen}', [CitizenController::class, 'destroy']);
            Route::get('/wilayah', [CitizenController::class, 'wilayah']);
            Route::get('/{id}/socioeconomic', [CitizenSocioeconomicController::class, 'show']);
            Route::put('/{id}/socioeconomic', [CitizenSocioeconomicController::class, 'upsert']);
        });

    /*
    |----------------------------------------------------------------------
    | Families / Kartu Keluarga (UC-09 sub-flow)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa, sama seperti Citizens.
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('families')
        ->group(function () {
            Route::get('/', [FamilyController::class, 'index']);
            Route::post('/', [FamilyController::class, 'store']);
            Route::get('/{family}', [FamilyController::class, 'show']);
            Route::patch('/{family}', [FamilyController::class, 'update']);
            Route::delete('/{family}', [FamilyController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | Dashboard (UC-15)
    |----------------------------------------------------------------------
    | Lintas-role: setiap role punya dashboard sendiri. Scoping data
    | (rt_id/rw_id/posisi) dilakukan di DashboardService berdasarkan
    | $user->role. Middleware role TIDAK dipasang sempit di sini karena
    | semua 9 role berhak mengakses endpoint ini (hanya datanya beda).
    */
    Route::prefix('dashboard')->group(function () {
        Route::get('/gender-stats', [DashboardController::class, 'genderStats']);
        Route::get('/letter-stats', [DashboardController::class, 'letterStats']);
    });

    /*
    |----------------------------------------------------------------------
    | Regions: Hamlets / RTs / RWs (UC-20)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa.
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))->group(function () {
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
    | Kasi/Kaur Approvals (UC-04d - Tahap Final)
    |----------------------------------------------------------------------
    | Resolusi lebih spesifik (approver_position + is_final) tetap
    | context check di KasiApprovalService - middleware ini hanya
    | memastikan role-nya benar kasi_pelayanan/kaur_tu_umum.
    */
    Route::middleware(UserRole::middleware(UserRole::KasiPelayanan, UserRole::KaurTuUmum))
        ->prefix('kasi')
        ->group(function () {
            Route::get('/letters', [KasiApprovalController::class, 'index']);
            Route::get('/letters/{letter}', [KasiApprovalController::class, 'show']);
            Route::patch('/letters/{letter}', [KasiApprovalController::class, 'decision']);
        });

    /*
    |----------------------------------------------------------------------
    | Letters (UC-03, UC-05, UC-06, UC-08)
    |----------------------------------------------------------------------
    */
    // Lintas-role: dipakai warga saat submit (pilih jenis surat) dan
    // Petugas Desa saat konfigurasi - tidak ada role-guard sempit.
    Route::get('/letter-categories', [LetterCategoryController::class, 'index']);
    Route::get('/letter-types', [LetterTypeController::class, 'index']);

    Route::prefix('letters')->group(function () {
        // UC-03: hanya Warga yang mengajukan permohonan surat self-service.
        Route::middleware(UserRole::middleware(UserRole::Warga))
            ->post('/', [LetterController::class, 'store']);

        // UC-05/UC-06/UC-08: lintas-role, scoping ada di
        // LetterService::getScopedLetters() (match per $user->role) dan
        // LetterPolicy::view()/LetterPolicy::delete(). Role 'kadus' akan
        // tetap ditolak 403 oleh LetterService (default => abort(403)),
        // konsisten dengan Kadus dihapus total dari domain approval surat.
        Route::get('/', [LetterController::class, 'index']);
        Route::get('/{id}', [LetterController::class, 'show']);
        Route::delete('/{letter}', [LetterController::class, 'destroy']);
        //        Route::patch('/{letter}/resubmit', [LetterController::class, 'resubmit']);
        Route::get('/{letter}/download', [LetterDownloadController::class, 'download']);

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
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('news')
        ->group(function () {
            Route::get('/', [NewsController::class, 'index']);
            Route::post('/', [NewsController::class, 'store']);
            Route::patch('/{id}', [NewsController::class, 'update']);
            Route::delete('/{id}', [NewsController::class, 'destroy']);
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
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('regulations')
        ->group(function () {
            Route::get('/', [RegulationController::class, 'index']);
            Route::post('/', [RegulationController::class, 'store']);
            Route::patch('/{id}', [RegulationController::class, 'update']);
            Route::delete('/{id}', [RegulationController::class, 'destroy']);
        });

    /*
    |----------------------------------------------------------------------
    | RT Approvals (UC-04a - Tahap 1)
    |----------------------------------------------------------------------
    | Context check wilayah (rt_id) tetap di RtApprovalService.
    */
    Route::middleware(UserRole::middleware(UserRole::Rt))
        ->prefix('rt')
        ->group(function () {
            Route::get('/letters', [RtApprovalController::class, 'index']);
            Route::get('/letters/{letter}', [RtApprovalController::class, 'show']);
            Route::patch('/letters/{letter}/decision', [RtApprovalController::class, 'decision']);
        });

    /*
    |----------------------------------------------------------------------
    | Kades Approvals (UC-04c)
    |----------------------------------------------------------------------
    | Diakses oleh official position 'kepala_desa' ATAU
    | 'sekdes' — keduanya saling menggantikan (first-action-wins),
    | lihat docblock KadesApprovalService dan SID-ARCH-BE-001 S3.3.
    | Status keputusan ini masih rekomendasi/asumsi default (belum
    | keputusan final eksplisit dari desa) - lihat
    | TDD-05_Roadmap_Risks_OpenQuestions Section 3.1.
    */
    Route::middleware(UserRole::middleware(UserRole::KepalaDesa, UserRole::SekretarisDesa))
        ->prefix('kades')
        ->group(function () {
            Route::get('/letters', [KadesApprovalController::class, 'index']);
            Route::get('/letters/{letter}', [KadesApprovalController::class, 'show']);
            Route::patch('/letters/{letter}/decision', [KadesApprovalController::class, 'decision']);
        });

    /*
    |----------------------------------------------------------------------
    | RW (read-only FYI, UC-04a sub-flow)
    |----------------------------------------------------------------------
    | RW BUKAN approver sejak v5.0 (SID-ARCH-BE-001 S3.2) - tidak ada
    | dan tidak akan pernah ada endpoint decision untuk RW. Endpoint
    | ini murni read-only riwayat notifikasi FYI, tetap dibatasi role
    | 'rw' saja (bukan lintas-role) karena datanya spesifik wilayah RW
    | yang login.
    */
    Route::middleware(UserRole::middleware(UserRole::Rw))
        ->prefix('rw')
        ->group(function () {
            Route::get('/letters', [RwApprovalController::class, 'index']);
            Route::get('/letters/{letter}', [RwApprovalController::class, 'show']);
        });

    /*
    |----------------------------------------------------------------------
    | Officials
    |----------------------------------------------------------------------
    | Fondasi CRUD data pejabat/petugas desa (RT, RW, Kadus, Kasi, dll).
    | Role-check di sini SENGAJA dilonggarkan ke seluruh role
    | authenticated - context check granular (siapa boleh apa) tetap
    | didelegasikan ke OfficialPolicy lewat $this->authorize() di
    | OfficialController (MANAGER_ROLES: kepala_desa, sekretaris_desa,
    | petugas_desa). Ini contoh sah: Policy tetap dipertahankan sebagai
    | defense-in-depth kedua di belakang middleware yang lebih permisif,
    | bukan duplikasi peran.
    */
    Route::prefix('officials')->group(function () {
        Route::get('/', [OfficialController::class, 'index']);
        Route::post('/', [OfficialController::class, 'store']);
        Route::get('/{official}', [OfficialController::class, 'show']);
        Route::patch('/{official}', [OfficialController::class, 'update']);
        Route::delete('/{official}', [OfficialController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Users (UC-14)
    |----------------------------------------------------------------------
    | Eksklusif Petugas Desa (Kelola User & Role).
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('users')
        ->group(function () {
            Route::get('/', [UserController::class, 'index']);
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

        Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
            ->patch('/profile', [VillageProfileController::class, 'update']);
    });

    /*
    |--------------------------------------------------------------------------
    | Village Org (Organisasi Non-Struktural: BPD/BUMDES/LPM/Karang Taruna/PKK)
    |--------------------------------------------------------------------------
    | UC-23. Eksklusif Petugas Desa. Route resource untuk jabatan
    | (village_org_positions) dan anggota (village_org_members) mengikuti
    | struktur nested sesuai api_spec_v5 paths/village-org/*.yaml.
    */
    Route::middleware(UserRole::middleware(UserRole::PetugasDesa))
        ->prefix('village-org-positions')
        ->group(function () {
            Route::get('/', [VillageOrgPositionController::class, 'index']);
            Route::post('/', [VillageOrgPositionController::class, 'store']);
            Route::get('/{id}', [VillageOrgPositionController::class, 'show']);
            Route::patch('/{id}', [VillageOrgPositionController::class, 'update']);
            Route::delete('/{id}', [VillageOrgPositionController::class, 'destroy']);

            Route::post('/{position}/members', [VillageOrgMemberController::class, 'store']);
            Route::patch('/{position}/members/{id}', [VillageOrgMemberController::class, 'update']);
            Route::delete('/{position}/members/{id}', [VillageOrgMemberController::class, 'destroy']);
        });
});
