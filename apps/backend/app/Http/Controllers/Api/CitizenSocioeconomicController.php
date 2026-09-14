<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShowCitizenSocioeconomicRequest;
use App\Http\Requests\UpsertCitizenSocioeconomicRequest;
use App\Http\Resources\CitizenSocioeconomicResource;
use App\Services\CitizenSocioeconomicService;
use Illuminate\Http\JsonResponse;

class CitizenSocioeconomicController extends Controller
{
    public function __construct(
        private readonly CitizenSocioeconomicService $service,
    ) {}

    public function show(ShowCitizenSocioeconomicRequest $request, int $id): JsonResponse
    {
        $socioeconomic = $this->service->get($id);

        return (new CitizenSocioeconomicResource($socioeconomic))->response();
    }

    public function upsert(UpsertCitizenSocioeconomicRequest $request, int $id): JsonResponse
    {
        $socioeconomic = $this->service->upsert($request->user(), $id, $request->validated());

        // api_spec mendokumentasikan 200 sebagai satu-satunya kode sukses
        // untuk PUT ini (upsert) - override default JsonResource yang
        // otomatis balikin 201 saat model baru pertama kali dibuat.
        return (new CitizenSocioeconomicResource($socioeconomic))->response()->setStatusCode(200);
    }
}
