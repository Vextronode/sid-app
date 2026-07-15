<?php

use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterTypeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RwApprovalController;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Api\LetterApprovalController;

    Route::post('/login-test', function (LoginRequest $request) {

        $request->authenticate();

        $token = Auth::user()->createToken('postman')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'token' => $token,
            'user' => Auth::user(),
        ]);
    });

    Route::middleware('auth:sanctum')
    ->prefix('rw')
    ->group(function () {

        Route::get('/user', function (Request $request) {
            return $request->user();
        });

        Route::get('/letter-types', [LetterTypeController::class, 'index']);
        
        Route::post('/letters', [LetterController::class, 'store']);

        Route::post(
            '/letters/{letter}/approve',
            [LetterApprovalController::class,'approve']
        );

        Route::get(
            '/letters',
            [LetterController::class, 'index']
        );

        Route::get(
            '/letters/{id}',
            [LetterController::class, 'show']
        );    

        
    });

    Route::middleware('auth:sanctum')
    ->prefix('rw')
    ->group(function () {
    Route::patch(
            '/approvals/{letter}/approve',
            [RwApprovalController::class, 'approve']
        );
    });