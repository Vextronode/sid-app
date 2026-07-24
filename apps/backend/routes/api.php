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
use App\Http\Controllers\Api\KasiApprovalController;
/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

    Route::post(
        '/login',
        [AuthenticatedSessionController::class, 'store']
    );



/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::post(
        '/logout',
        [AuthenticatedSessionController::class, 'logout']
    )->middleware('auth:sanctum');

    Route::get('/user', function (Request $request) {

        return $request
            ->user()
            ->load([
                'citizen.village',
                'citizen.hamlet',
                'citizen.rt',
                'citizen.rw',
                'official'
            ]);

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
            [RtApprovalController::class,'index']
        );


        Route::get(
            '/letters/{letter}',
            [RtApprovalController::class,'show']
        );


        Route::patch(
            '/letters/{letter}/decision',
            [RtApprovalController::class,'decision']
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
                [KasiApprovalController::class,'show']
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
            Route::get(
                '/letters/{letter}',
                [KadusApprovalController::class,'show']
            );
    });



});