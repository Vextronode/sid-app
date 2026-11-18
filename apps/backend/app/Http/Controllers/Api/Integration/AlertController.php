<?php

namespace App\Http\Controllers\Api\Integration;

use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\UpsertDisasterAlertRequest;
use App\Http\Resources\Integration\AlertReceiptResource;
use App\Models\IntegrationClient;
use App\Services\DisasterAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Peringatan bencana dari SIGAP (/api/integrations/v1/alerts). Ability
 * `alerts:write` dicek middleware route; aturan di DisasterAlertService.
 */
class AlertController extends Controller
{
    public function __construct(
        protected DisasterAlertService $disasterAlertService,
    ) {}

    /** 201 bila peringatan baru, 200 bila diperbarui atau diabaikan. */
    public function upsert(UpsertDisasterAlertRequest $request, string $externalId): JsonResponse
    {
        ['alert' => $alert, 'created' => $created] = $this->disasterAlertService->upsertFromSigap(
            $this->client($request),
            $externalId,
            $request->validated(),
        );

        return (new AlertReceiptResource($alert))
            ->response()
            ->setStatusCode($created ? 201 : 200);
    }

    public function end(Request $request, string $externalId): AlertReceiptResource
    {
        return new AlertReceiptResource(
            $this->disasterAlertService->endFromSigap($this->client($request), $externalId),
        );
    }

    private function client(Request $request): IntegrationClient
    {
        /** @var IntegrationClient */
        return $request->user();
    }
}
