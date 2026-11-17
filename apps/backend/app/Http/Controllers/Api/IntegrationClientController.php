<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IntegrationPasswordRequest;
use App\Http\Requests\UpdateIntegrationClientStatusRequest;
use App\Http\Resources\IntegrationClientResource;
use App\Models\IntegrationClient;
use App\Services\IntegrationClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Menu Integrasi Staf SIDUTama: status client dan token aplikasi pihak
 * ketiga di desa staf. Membuat client dan mengubah ability hanya lewat
 * artisan `integration:*`.
 */
class IntegrationClientController extends Controller
{
    public function __construct(
        protected IntegrationClientService $integrationClientService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return IntegrationClientResource::collection(
            $this->integrationClientService->listForVillage((string) $request->user()->village_id),
        );
    }

    public function updateStatus(UpdateIntegrationClientStatusRequest $request, IntegrationClient $integrationClient): JsonResponse
    {
        $this->ensureSameVillage($request, $integrationClient);

        $active = $request->boolean('is_active');
        $client = $this->integrationClientService->setActive($integrationClient, $active, $request->user());

        return $this->clientResponse($client, $active
            ? "{$client->name} diaktifkan kembali."
            : "{$client->name} dinonaktifkan. Semua request dari aplikasi ini ditolak sampai diaktifkan kembali.");
    }

    /** Rotate: token baru dikembalikan sekali di respons ini. */
    public function issueToken(IntegrationPasswordRequest $request, IntegrationClient $integrationClient): JsonResponse
    {
        $this->ensureSameVillage($request, $integrationClient);

        $token = $this->integrationClientService->issueToken($integrationClient, $request->user());

        return $this->clientResponse(
            $integrationClient,
            'Token baru diterbitkan. Token lama tetap berlaku sampai dicabut.',
            ['token' => $token],
        );
    }

    public function revokeToken(IntegrationPasswordRequest $request, IntegrationClient $integrationClient, string $token): JsonResponse
    {
        $this->ensureSameVillage($request, $integrationClient);

        $this->integrationClientService->revokeToken($integrationClient, $token, $request->user());

        return $this->clientResponse($integrationClient, 'Token dicabut. Request dengan token itu langsung ditolak.');
    }

    private function ensureSameVillage(Request $request, IntegrationClient $client): void
    {
        abort_unless($client->village_id === $request->user()->village_id, 404);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function clientResponse(IntegrationClient $client, string $message, array $extra = []): JsonResponse
    {
        $client->load(['tokens' => fn ($query) => $query->orderByDesc('created_at')]);

        return response()->json([
            'data' => (new IntegrationClientResource($client))->resolve(),
            'message' => $message,
            ...$extra,
        ]);
    }
}
