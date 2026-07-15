<?php

use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterTypeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Auth\AuthenticatedSessionController;


Route::post('/login', function (LoginRequest $request) {

    $request->authenticate();

    return response()->json([
        'message' => 'Login berhasil',
        'user' => Auth::user(),
        'token' => $request->user()->createToken('auth_token')->plainTextToken,
    ]);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'logout'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {

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
