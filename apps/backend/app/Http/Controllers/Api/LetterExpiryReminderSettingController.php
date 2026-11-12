<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexLetterExpiryReminderSettingRequest;
use App\Http\Requests\UpdateLetterExpiryReminderSettingRequest;
use App\Http\Resources\LetterExpiryReminderSettingResource;
use App\Services\LetterExpiryReminderSettingService;
use Illuminate\Http\JsonResponse;

class LetterExpiryReminderSettingController extends Controller
{
    public function __construct(
        private readonly LetterExpiryReminderSettingService $service,
    ) {}

    public function index(IndexLetterExpiryReminderSettingRequest $request): JsonResponse
    {
        $settings = $this->service->list($request->user());

        return LetterExpiryReminderSettingResource::collection($settings)->response();
    }

    public function update(UpdateLetterExpiryReminderSettingRequest $request, int $id): JsonResponse
    {
        $setting = $this->service->update($id, $request->boolean('is_active'), $request->user());

        return (new LetterExpiryReminderSettingResource($setting))->response();
    }
}
