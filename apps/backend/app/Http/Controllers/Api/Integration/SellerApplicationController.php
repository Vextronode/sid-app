<?php

namespace App\Http\Controllers\Api\Integration;

use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\IndexSellerApplicationRequest;
use App\Http\Requests\Integration\UpdateSellerApplicationRequest;
use App\Http\Resources\Integration\SellerApplicationResource;
use App\Models\IntegrationClient;
use App\Services\SellerApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Permohonan pedagang untuk Cimart (/api/integrations/v1/seller-applications).
 * Ability dicek middleware route; cakupan data di SellerApplicationService.
 */
class SellerApplicationController extends Controller
{
    public function __construct(
        protected SellerApplicationService $sellerApplicationService,
    ) {}

    public function index(IndexSellerApplicationRequest $request): JsonResponse
    {
        $applications = $this->sellerApplicationService->paginate($this->client($request), $request->validated());

        return response()->json([
            'data' => SellerApplicationResource::collection($applications->getCollection())->resolve($request),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
                'last_page' => $applications->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, string $businessRef): SellerApplicationResource
    {
        return new SellerApplicationResource(
            $this->sellerApplicationService->show($this->client($request), $businessRef),
        );
    }

    public function update(UpdateSellerApplicationRequest $request, string $businessRef): SellerApplicationResource
    {
        return new SellerApplicationResource($this->sellerApplicationService->report(
            $this->client($request),
            $businessRef,
            $request->status(),
            $request->note(),
        ));
    }

    private function client(Request $request): IntegrationClient
    {
        /** @var IntegrationClient */
        return $request->user();
    }
}
