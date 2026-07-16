<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

use App\Http\Requests\Auth\LoginRequest;

use App\Http\Controllers\Auth\AuthenticatedSessionController;

use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterTypeController;
use App\Http\Controllers\Api\LetterApprovalController;
use App\Http\Controllers\Api\RtApprovalController;
use App\Http\Controllers\Api\RwApprovalController;
use App\Http\Controllers\Api\KadusApprovalController;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', function (LoginRequest $request) {

    $request->authenticate();

    return response()->json([
        'message' => 'Login berhasil',
        'user'    => Auth::user(),
        'token'   => $request->user()->createToken('auth_token')->plainTextToken,
    ]);
});

Route::post(
    '/logout',
    [AuthenticatedSessionController::class, 'logout']
)->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });


    Route::get('/letter-types', [LetterTypeController::class, 'index']);

    Route::post('/letters', [LetterController::class, 'store']);

    Route::get('/letters', [LetterController::class, 'index']);

    Route::get('/letters/{id}', [LetterController::class, 'show']);

    Route::post(
        '/letters/{letter}/approve',
        [LetterApprovalController::class, 'approve']
    );



    Route::prefix('rt')->group(function () {
        Route::get(
            '/letters',
            [RtApprovalController::class, 'index']
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

    });

    
    Route::prefix('kadus')->group(function (){
        
        Route::get(
                '/letters',
                [KadusApprovalController::class, 'index']
            );

            Route::patch(
                '/letters/{letter}/decision',
                [KadusApprovalController::class, 'decision']
            );
    });

        Route::get(
            '/letters',
            [RtApprovalController::class, 'index']
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

    });

});