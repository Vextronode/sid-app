<?php

namespace App\Http\Controllers\Api\Integration;

use App\Http\Controllers\Controller;
use App\Models\IntegrationClient;
use App\Support\IntegrationAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/integrations/v1/ping: tes koneksi dan token untuk semua client
 * integrasi aktif, tanpa ability khusus.
 */
class PingController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var IntegrationClient $client */
        $client = $request->user();

        IntegrationAudit::record($client, 'ping', 'Tes koneksi integrasi');

        return response()->json([
            'data' => [
                'client' => $client->name,
                'abilities' => array_values($client->currentAccessToken()->abilities ?? []),
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }
}
