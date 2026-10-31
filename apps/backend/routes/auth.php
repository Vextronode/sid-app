<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\PasswordResetRequestController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [RegisteredUserController::class, 'store'])
    ->middleware(['guest', 'throttle:register'])
    ->name('register');

Route::post('/login', [AuthenticatedSessionController::class, 'store'])
    ->middleware('guest')
    ->name('login');

Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
    ->middleware(['guest', 'throttle:6,1'])
    ->name('password.email');

Route::post('/reset-password', [NewPasswordController::class, 'store'])
    ->middleware(['guest', 'throttle:6,1'])
    ->name('password.store');

// Lupa kata sandi tanpa email: diajukan dengan NIK + tanggal lahir,
// disetujui Staf SIDUTama, lalu diselesaikan dengan token klaim dari
// perangkat pengaju. Lihat PasswordResetRequestService.
Route::post('/password-reset-requests', [PasswordResetRequestController::class, 'store'])
    ->middleware(['guest', 'throttle:password-reset-request'])
    ->name('password-reset-requests.store');

Route::post('/password-reset-requests/status', [PasswordResetRequestController::class, 'status'])
    ->middleware(['guest', 'throttle:30,1'])
    ->name('password-reset-requests.status');

Route::post('/password-reset-requests/complete', [PasswordResetRequestController::class, 'complete'])
    ->middleware(['guest', 'throttle:6,1'])
    ->name('password-reset-requests.complete');

Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['auth', 'signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
    ->middleware(['auth', 'throttle:6,1'])
    ->name('verification.send');

Route::post('/logout', [AuthenticatedSessionController::class, 'logout'])
    ->middleware('auth:sanctum')
    ->name('logout');
