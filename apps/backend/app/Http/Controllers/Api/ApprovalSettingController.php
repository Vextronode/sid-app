<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexApprovalSettingRequest;
use App\Http\Requests\UpdateApprovalSettingRequest;
use App\Http\Resources\ApprovalSettingCollection;
use App\Http\Resources\ApprovalSettingResource;
use App\Services\ApprovalSettingService;
use Illuminate\Http\JsonResponse;

class ApprovalSettingController extends Controller
{
    public function __construct(
        private readonly ApprovalSettingService $service,
    ) {}

    public function index(IndexApprovalSettingRequest $request): JsonResponse
    {
        $settings = $this->service->list($request->user());

        return (new ApprovalSettingCollection($settings))->response();
    }

    public function update(UpdateApprovalSettingRequest $request, int $id): JsonResponse
    {
        $setting = $this->service->update($id, $request->validated());

        return (new ApprovalSettingResource($setting))->response();
    }
}
