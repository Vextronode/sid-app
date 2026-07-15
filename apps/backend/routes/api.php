<?php

use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LetterTypeController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\LetterApprovalController;
use App\Http\Controllers\Api\RtApprovalController;


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
    
    Route::get(
        '/rt/letters',
        [RtApprovalController::class, 'index']
    );

    Route::patch(
        '/rt/letters/{letter}/decision',
        [RtApprovalController::class, 'decision']
    );

});