<?php

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
    | Approval Flows
    |----------------------------------------------------------------------
    */
    Route::prefix('approval-flows')->group(function () {
        Route::get('/', [ApprovalFlowController::class, 'index']);
        Route::post('/', [ApprovalFlowController::class, 'store']);
        Route::get('/{id}', [ApprovalFlowController::class, 'show']);
        Route::put('/{id}/steps', [ApprovalFlowController::class, 'replaceSteps']);
    });

    /*
    |----------------------------------------------------------------------
    | Approval Settings
    |----------------------------------------------------------------------
    */
    Route::prefix('approval-settings')->group(function () {
        Route::get('/', [ApprovalSettingController::class, 'index']);
        Route::patch('/{id}', [ApprovalSettingController::class, 'update']);
    });

    /*
    |----------------------------------------------------------------------
    | Citizens
    |----------------------------------------------------------------------
    */
    Route::prefix('citizens')->group(function () {
        Route::get('/', [CitizenController::class, 'index']);
        Route::delete('/{citizen}', [CitizenController::class, 'destroy']);
        Route::get('/wilayah', [CitizenController::class, 'wilayah']);
        Route::get('/{id}/socioeconomic', [CitizenSocioeconomicController::class, 'show']);
        Route::put('/{id}/socioeconomic', [CitizenSocioeconomicController::class, 'upsert']);
    });

    /*
    |----------------------------------------------------------------------
    | Families (Kartu Keluarga)
    |----------------------------------------------------------------------
    */
    Route::prefix('families')->group(function () {
        Route::get('/', [FamilyController::class, 'index']);
        Route::post('/', [FamilyController::class, 'store']);
        Route::get('/{family}', [FamilyController::class, 'show']);
        Route::patch('/{family}', [FamilyController::class, 'update']);
        Route::delete('/{family}', [FamilyController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Dashboard
    |----------------------------------------------------------------------
    */
    Route::prefix('dashboard')->group(function () {
        Route::get('/gender-stats', [DashboardController::class, 'genderStats']);
        Route::get('/letter-stats', [DashboardController::class, 'letterStats']);
    });

    /*
    |----------------------------------------------------------------------
    | Regions: Hamlets
    |----------------------------------------------------------------------
    */
    Route::prefix('hamlets')->group(function () {
        Route::get('/', [HamletController::class, 'index']);
        Route::post('/', [HamletController::class, 'store']);
        Route::patch('/{hamlet}', [HamletController::class, 'update']);
        Route::delete('/{hamlet}', [HamletController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Kasi Approvals
    |----------------------------------------------------------------------
    */
    Route::prefix('kasi')->group(function () {
        Route::get('/letters', [KasiApprovalController::class, 'index']);
        Route::get('/letters/{letter}', [KasiApprovalController::class, 'show']);
        Route::patch('/letters/{letter}', [KasiApprovalController::class, 'decision']);
    });

    /*
    |----------------------------------------------------------------------
    | Letters
    |----------------------------------------------------------------------
    */
    Route::get('/letter-categories', [LetterCategoryController::class, 'index']);
    Route::get('/letter-types', [LetterTypeController::class, 'index']);

    Route::prefix('letters')->group(function () {
        Route::get('/', [LetterController::class, 'index']);
        Route::post('/', [LetterController::class, 'store']);
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
    | News
    |----------------------------------------------------------------------
    */
    Route::prefix('news')->group(function () {
        Route::get('/', [NewsController::class, 'index']);
        Route::post('/', [NewsController::class, 'store']);
        Route::patch('/{id}', [NewsController::class, 'update']);
        Route::delete('/{id}', [NewsController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Notifications
    |----------------------------------------------------------------------
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
    | Village Regulations
    |----------------------------------------------------------------------
    */
    Route::prefix('regulations')->group(function () {
        Route::get('/', [RegulationController::class, 'index']);
        Route::post('/', [RegulationController::class, 'store']);
        Route::patch('/{id}', [RegulationController::class, 'update']);
        Route::delete('/{id}', [RegulationController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Regions: RTs
    |----------------------------------------------------------------------
    | Catatan refactor: sebelumnya RegionController (lihat catatan di
    | grup Hamlets di atas). Dipecah menjadi RtController.
    */
    Route::prefix('rts')->group(function () {
        Route::get('/', [RtController::class, 'index']);
        Route::post('/', [RtController::class, 'store']);
        Route::patch('/{rt}', [RtController::class, 'update']);
        Route::delete('/{rt}', [RtController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | RT Approvals
    |----------------------------------------------------------------------
    */
    Route::prefix('rt')->group(function () {
        Route::get('/letters', [RtApprovalController::class, 'index']);
        Route::get('/letters/{letter}', [RtApprovalController::class, 'show']);
        Route::patch('/letters/{letter}/decision', [RtApprovalController::class, 'decision']);
    });

    /*
    |----------------------------------------------------------------------
    | Kades Approvals
    |----------------------------------------------------------------------
    | Diakses oleh official position 'kepala_desa' ATAU
    | 'sekdes' — keduanya saling menggantikan (first-come-first-served),
    | lihat docblock KadesApprovalService.
    */
    Route::prefix('kades')->group(function () {
        Route::get('/letters', [KadesApprovalController::class, 'index']);
        Route::get('/letters/{letter}', [KadesApprovalController::class, 'show']);
        Route::patch('/letters/{letter}/decision', [KadesApprovalController::class, 'decision']);
    });

    /*
    |----------------------------------------------------------------------
    | Regions: RWs
    |----------------------------------------------------------------------
    | Catatan refactor: sebelumnya RegionController (lihat catatan di
    | grup Hamlets di atas). Dipecah menjadi RwController.
    */
    Route::prefix('rws')->group(function () {
        Route::get('/', [RwController::class, 'index']);
        Route::post('/', [RwController::class, 'store']);
        Route::patch('/{rw}', [RwController::class, 'update']);
        Route::delete('/{rw}', [RwController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | RW Approvals
    |----------------------------------------------------------------------
    */
    Route::prefix('rw')->group(function () {
        Route::get('/letters', [RwApprovalController::class, 'index']);
        Route::get('/letters/{letter}', [RwApprovalController::class, 'show']);
    });

    /*
    |----------------------------------------------------------------------
    | Officials
    |----------------------------------------------------------------------
    | Fondasi CRUD data pejabat/petugas desa (RT, RW, Kadus, Kasi, dll).
    | Otorisasi didelegasikan ke OfficialPolicy lewat $this->authorize()
    | di OfficialController.
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
    | Users
    |----------------------------------------------------------------------
    */
    Route::get('/user', [CurrentUserController::class, 'show']);

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::patch('/{user}/toggle-status', [UserController::class, 'updateStatus']);
    });

    /*
    |----------------------------------------------------------------------
    | Villages: Profile
    |----------------------------------------------------------------------
    */
    Route::prefix('villages')->group(function () {
        Route::get('/profile', [VillageProfileController::class, 'show']);
        Route::patch('/profile', [VillageProfileController::class, 'update']);
    });

    /*
    |--------------------------------------------------------------------------
    | Village Org (Organisasi Non-Struktural: BPD/BUMDES/LPM/Karang Taruna/PKK)
    |--------------------------------------------------------------------------
    | Route resource untuk jabatan
    | (village_org_positions) dan anggota (village_org_members) mengikuti
    | struktur nested sesuai api_spec_v5 paths/village-org/*.yaml.
    */
    Route::prefix('village-org-positions')->group(function () {
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
