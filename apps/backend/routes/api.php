<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Auth\AuthenticatedSessionController;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/login', function (LoginRequest $request) {

    $request->authenticate();

    return response()->json([
        'message' => 'Login berhasil',
        'user' => Auth::user(),
        'token' => $request->user()->createToken('auth_token')->plainTextToken,
    ]);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'logout'])->middleware('auth:sanctum');