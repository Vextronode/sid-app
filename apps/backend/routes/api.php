<?php

use App\Http\Controllers\Api\ApprovalFlowController;
use App\Http\Controllers\Api\CitizenController;
use App\Http\Controllers\Api\KadusApprovalController;
use App\Http\Controllers\Api\KasiApprovalController;
use App\Http\Controllers\Api\LetterApprovalController;
use App\Http\Controllers\Api\LetterCategoryController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterDownloadController;
use App\Http\Controllers\Api\LetterTypeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RegionController;
use App\Http\Controllers\Api\RtApprovalController;
use App\Http\Controllers\Api\RwApprovalController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VillageController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Models\Letter;
use App\Services\PdfService;
use Illuminate\Http\Request;
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
        Route::get('/gender-stats', [VillageController::class, 'genderStats']);
        Route::get('/letter-stats', [VillageController::class, 'letterStats']);
    });

    /*
    |----------------------------------------------------------------------
    | Regions: Hamlets
    |----------------------------------------------------------------------
    */
    Route::prefix('hamlets')->group(function () {
        Route::get('/', [RegionController::class, 'indexHamlets']);
        Route::post('/', [RegionController::class, 'storeHamlet']);
        Route::patch('/{hamlet}', [RegionController::class, 'updateHamlet']);
        Route::delete('/{hamlet}', [RegionController::class, 'destroyHamlet']);
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
        Route::patch('/{letter}/resubmit', [LetterController::class, 'resubmit']);
        Route::post('/{letter}/approve', [LetterApprovalController::class, 'approve']);
        Route::get('/{letter}/download', [LetterDownloadController::class, 'download']);
        Route::get('/{letter}/preview', function (Letter $letter, PdfService $service) {
            return $service->preview($letter, auth()->user(), request('template', 'wet'));
        })->name('letters.preview');
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
    */
    Route::prefix('rts')->group(function () {
        Route::get('/', [RegionController::class, 'indexRts']);
        Route::post('/', [RegionController::class, 'storeRt']);
        Route::patch('/{rt}', [RegionController::class, 'updateRt']);
        Route::delete('/{rt}', [RegionController::class, 'destroyRt']);
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
    */
    Route::prefix('rws')->group(function () {
        Route::get('/', [RegionController::class, 'indexRws']);
        Route::post('/', [RegionController::class, 'storeRw']);
        Route::patch('/{rw}', [RegionController::class, 'updateRw']);
        Route::delete('/{rw}', [RegionController::class, 'destroyRw']);
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
    Route::get('/user', function (Request $request) {
        return $request
            ->user()
            ->load([
                'citizen.village',
                'citizen.hamlet',
                'citizen.rt',
                'citizen.rw',
                'official',
            ]);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::patch('/{user}/toggle-status', [UserController::class, 'updateStatus']);
    });

});
