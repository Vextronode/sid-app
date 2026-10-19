<?php

use App\Exceptions\OccupationInUseException;
use App\Exceptions\RegionContainsCitizensException;
use App\Exceptions\RegionHasActiveCitizensException;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Support\ApiExceptionMessages;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
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
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (
            RegionHasActiveCitizensException|RegionContainsCitizensException|OccupationInUseException $exception,
            Request $request
        ): JsonResponse {
            return response()->json([
                'message' => $exception->getMessage(),
            ], $exception->getStatusCode());
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
