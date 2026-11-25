<?php

use App\Exceptions\OccupationInUseException;
use App\Exceptions\RecordInUseException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureIntegrationClient;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Support\ApiExceptionMessages;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\Exceptions\MissingAbilityException;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // POST /api/broadcasting/auth: otorisasi channel private Reverb dengan
    // sesi Sanctum SPA yang sama seperti API lain (grup `api` memulai sesi
    // dan memeriksa CSRF), plus syarat akun aktif dan kata sandi sudah diganti.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', [
        'prefix' => 'api',
        'middleware' => ['api', 'auth:sanctum', 'account.active', 'password.changed'],
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'account.active' => EnsureUserIsActive::class,
            'verified' => EnsureEmailIsVerified::class,
            'password.changed' => EnsurePasswordIsChanged::class,
            'role' => EnsureUserHasRole::class,
            // API integrasi pihak ketiga (/api/integrations/v1).
            'integration.client' => EnsureIntegrationClient::class,
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (
            RegionHasActiveCitizensException|RecordInUseException|OccupationInUseException $exception,
            Request $request
        ): JsonResponse {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->getStatusCode());
        });

        // API integrasi: klien membaca `code`, dan 401 berarti token salah,
        // bukan sesi login yang habis. MissingAbilityException (dari
        // middleware `abilities:`) sudah diubah framework menjadi
        // AccessDeniedHttpException saat callback ini dijalankan.
        $exceptions->render(function (AccessDeniedHttpException $exception): ?JsonResponse {
            if (! $exception->getPrevious() instanceof MissingAbilityException) {
                return null;
            }

            return response()->json([
                'message' => 'Token tidak memiliki akses ke endpoint ini.',
                'code' => 'ability_forbidden',
            ], 403);
        });

        $exceptions->render(function (AuthenticationException $exception, Request $request): ?JsonResponse {
            if (! $request->is('api/integrations/*')) {
                return null;
            }

            return response()->json(['message' => 'Token tidak valid.'], 401);
        });

        // Pesan bawaan framework (401/403/404/419/429/5xx) dalam bahasa
        // Indonesia untuk permintaan API; pesan kustom tetap dipakai.
        $exceptions->render(function (Throwable $exception, Request $request): ?JsonResponse {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            return ApiExceptionMessages::render($exception);
        });
    })->create();
