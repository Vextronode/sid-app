<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexLetterExpiryReminderSettingRequest;
use App\Http\Requests\UpdateLetterExpiryReminderSendTimeRequest;
use App\Http\Requests\UpdateLetterExpiryReminderSettingRequest;
use App\Http\Resources\LetterExpiryReminderSettingResource;
use App\Models\Village;
use App\Services\LetterExpiryReminderSettingService;
use Illuminate\Http\JsonResponse;

class LetterExpiryReminderSettingController extends Controller
{
    public function __construct(
        private readonly LetterExpiryReminderSettingService $service,
    ) {}

    /**
     * Titik pengingat desa pengguna. meta.send_at: jam kirim (H:i);
     * meta.send_at_options: pilihan jam yang boleh dipilih.
     */
    public function index(IndexLetterExpiryReminderSettingRequest $request): JsonResponse
    {
        $settings = $this->service->list($request->user());

        return LetterExpiryReminderSettingResource::collection($settings)
            ->additional(['meta' => [
                'send_at' => $this->service->sendTime($request->user()),
                'send_at_options' => Village::expiryReminderSendTimeOptions(),
            ]])
            ->response();
    }

    public function updateSendTime(UpdateLetterExpiryReminderSendTimeRequest $request): JsonResponse
    {
        $sendTime = $this->service->updateSendTime($request->validated('send_at'), $request->user());

        return response()->json(['data' => ['send_at' => $sendTime]]);
    }

    public function update(UpdateLetterExpiryReminderSettingRequest $request, int $id): JsonResponse
    {
        $setting = $this->service->update($id, $request->boolean('is_active'), $request->user());

        return (new LetterExpiryReminderSettingResource($setting))->response();
    }
}
