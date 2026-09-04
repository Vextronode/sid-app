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
use app\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RegionController;
use App\Http\Controllers\Api\RtApprovalController;
use App\Http\Controllers\Api\RwApprovalController;
use App\Http\Controllers\Api\UserController;
use app\Http\Controllers\Api\VillageController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use app\Models\Letter;
use App\Services\PdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// use App\Http\Controllers\Api\OfficialController;

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/approval-flows', [ApprovalFlowController::class, 'index']);
    Route::post('/approval-flows', [ApprovalFlowController::class, 'store']);
    Route::get('/approval-flows/{id}', [ApprovalFlowController::class, 'show']);
    Route::put('/approval-flows/{id}/steps', [ApprovalFlowController::class, 'replaceSteps']);

    Route::get(
        '/notifications',
        [NotificationController::class, 'index']
    );

    Route::get(
        '/letter-categories',
        [LetterCategoryController::class, 'index']);

    Route::post(
        '/notifications/read-all',
        [NotificationController::class, 'readAll']
    );

    Route::post(
        '/notifications/{id}/read',
        [NotificationController::class, 'read']
    );

    Route::get(
        '/notifications/unread-count',
        [NotificationController::class, 'unreadCount']
    );
    Route::post(
        '/logout',
        [AuthenticatedSessionController::class, 'logout']
    )->middleware('auth:sanctum');
    Route::get('/users',
        [UserController::class, 'index']
    );

    Route::patch('/users/{user}/toggle-status',
        [UserController::class, 'updateStatus']
    );
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
    Route::get(
        '/dashboard/gender-stats',
        [VillageController::class, 'genderStats']
    );
    Route::get(
        '/dashboard/letter-stats',
        [VillageController::class, 'letterStats']
    );

    Route::get('/letter-types', [LetterTypeController::class, 'index']);

    Route::get('/hamlets', [RegionController::class, 'indexHamlets']);
    Route::post('/hamlets', [RegionController::class, 'storeHamlet']);
    Route::patch('/hamlets/{hamlet}', [RegionController::class, 'updateHamlet']);
    Route::delete('/hamlets/{hamlet}', [RegionController::class, 'destroyHamlet']);

    Route::get('/rws', [RegionController::class, 'indexRws']);
    Route::post('/rws', [RegionController::class, 'storeRw']);
    Route::patch('/rws/{rw}', [RegionController::class, 'updateRw']);
    Route::delete('/rws/{rw}', [RegionController::class, 'destroyRw']);

    Route::get('/rts', [RegionController::class, 'indexRts']);
    Route::post('/rts', [RegionController::class, 'storeRt']);
    Route::patch('/rts/{rt}', [RegionController::class, 'updateRt']);
    Route::delete('/rts/{rt}', [RegionController::class, 'destroyRt']);

    Route::post('/letters', [LetterController::class, 'store']);

    Route::get('/letters', [LetterController::class, 'index']);

    Route::delete('/letters/{letter}', [LetterController::class, 'destroy']);

    Route::patch('/letters/{letter}/resubmit', [LetterController::class, 'resubmit']);

    Route::get('/letters/{id}', [LetterController::class, 'show']);

    Route::post(
        '/letters/{letter}/approve',
        [LetterApprovalController::class, 'approve']
    );

    Route::get(
        '/letters/{letter}/download',
        [LetterDownloadController::class, 'download']
    );

    Route::get('/letters/{letter}/preview', function (Letter $letter, PdfService $service) {
        return $service->preview($letter, auth()->user(), request('template', 'wet'));
    })->name('letters.preview');

    Route::prefix('citizens')->group(function () {

        Route::get('/', [CitizenController::class, 'index']);

        Route::delete(
            '/{citizen}',
            [CitizenController::class, 'destroy']
        );
        Route::get(
            '/wilayah',
            [CitizenController::class, 'wilayah']
        );

    });
    Route::prefix('rt')->group(function () {

        Route::get(
            '/letters',
            [RtApprovalController::class, 'index']
        );

        Route::get(
            '/letters/{letter}',
            [RtApprovalController::class, 'show']
        );

        Route::patch(
            '/letters/{letter}/decision',
            [RtApprovalController::class, 'decision']
        );

    });

    Route::prefix('rw')->group(function () {

        Route::patch(
            '/approvals/{letter}/approve',
            [RwApprovalController::class, 'approve']
        );
        Route::get(
            '/letters',
            [RwApprovalController::class, 'index']
        );
        Route::get(
            '/letters/{letter}',
            [RwApprovalController::class, 'show']
        );

    });

    Route::prefix('kasi')->group(function () {

        Route::get(
            '/letters',
            [KasiApprovalController::class, 'index']
        );

        Route::patch(
            '/approvals/{letter}/approve',
            [KasiApprovalController::class, 'approve']
        );
        Route::get(
            '/letters/{letter}',
            [KasiApprovalController::class, 'show']
        );

    });

    Route::prefix('kadus')->group(function () {

        Route::get(
            '/letters',
            [KadusApprovalController::class, 'index']
        );

        Route::patch(
            '/letters/{letter}/decision',
            [KadusApprovalController::class, 'decision']
        );
        Route::get(
            '/letters/{letter}',
            [KadusApprovalController::class, 'show']
        );
    });

    // Route::prefix('official')->group(function () {
    // Route::post('/signature', [OfficialController::class, 'uploadSignature']);
    // Route::get('/signature', [OfficialController::class, 'getSignature']);
    // });

});
