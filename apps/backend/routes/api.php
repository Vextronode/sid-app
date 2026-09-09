<?php

use App\Http\Controllers\Api\ApprovalFlowController;
use App\Http\Controllers\Api\CitizenController;
use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HamletController;
use App\Http\Controllers\Api\KadusApprovalController;
use App\Http\Controllers\Api\KasiApprovalController;
use App\Http\Controllers\Api\LetterApprovalController;
use App\Http\Controllers\Api\LetterCategoryController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterDownloadController;
use App\Http\Controllers\Api\LetterTypeController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RegionController;
use App\Http\Controllers\Api\RtApprovalController;
use App\Http\Controllers\Api\RtController;
use App\Http\Controllers\Api\RwApprovalController;
use App\Http\Controllers\Api\RwController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VillageProfileController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Models\Letter;
use App\Services\PdfService;
use Illuminate\Support\Facades\Route;

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
    | Citizens
    |----------------------------------------------------------------------
    */
    Route::prefix('citizens')->group(function () {
        Route::get('/', [CitizenController::class, 'index']);
        Route::delete('/{citizen}', [CitizenController::class, 'destroy']);
        Route::get('/wilayah', [CitizenController::class, 'wilayah']);
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
    | Kadus Approvals
    |----------------------------------------------------------------------
    */
    Route::prefix('kadus')->group(function () {
        Route::get('/letters', [KadusApprovalController::class, 'index']);
        Route::get('/letters/{letter}', [KadusApprovalController::class, 'show']);
        Route::patch('/letters/{letter}/decision', [KadusApprovalController::class, 'decision']);
    });

    /*
    |----------------------------------------------------------------------
    | Kasi Approvals
    |----------------------------------------------------------------------
    */
    Route::prefix('kasi')->group(function () {
        Route::get('/letters', [KasiApprovalController::class, 'index']);
        Route::get('/letters/{letter}', [KasiApprovalController::class, 'show']);
        Route::patch('/approvals/{letter}/approve', [KasiApprovalController::class, 'approve']);
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
        Route::post('/{letter}/approve', [LetterApprovalController::class, 'approve']);
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
        Route::patch('/approvals/{letter}/approve', [RwApprovalController::class, 'approve']);
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

});
