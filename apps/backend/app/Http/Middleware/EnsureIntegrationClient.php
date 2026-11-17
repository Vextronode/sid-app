<?php

namespace App\Http\Middleware;

use App\Models\IntegrationClient;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wajib setelah `auth:integration`. Guard Sanctum memeriksa session cookie
 * lebih dulu, jadi User SID yang login dari frontend lolos guard dengan
 * TransientToken (dianggap punya semua ability). Middleware ini memastikan
 * pemanggil benar-benar client integrasi dengan token asli dan masih aktif.
 */
class EnsureIntegrationClient
{
    public function handle(Request $request, Closure $next): Response
    {
        $client = $request->user();

        if (! $client instanceof IntegrationClient || ! $client->currentAccessToken() instanceof PersonalAccessToken) {
            return new JsonResponse(['message' => 'Token tidak valid.'], Response::HTTP_UNAUTHORIZED);
        }

        if (! $client->is_active) {
            return new JsonResponse([
                'message' => 'Integrasi sedang dinonaktifkan oleh desa.',
                'code' => 'integration_disabled',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
