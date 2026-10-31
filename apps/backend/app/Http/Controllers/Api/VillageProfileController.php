<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResolveMapLinkRequest;
use App\Http\Requests\UpdateVillageProfileRequest;
use App\Http\Requests\UploadVillageImageRequest;
use App\Http\Resources\VillageResource;
use App\Services\GoogleMapsLinkResolver;
use App\Services\VillageProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VillageProfileController extends Controller
{
    public function __construct(
        private readonly VillageProfileService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $village = $this->service->getProfile($request->user());

        return (new VillageResource($village))->response();
    }

    public function update(UpdateVillageProfileRequest $request): JsonResponse
    {
        $village = $this->service->updateProfile($request->user(), $request->validated());

        return response()->json([
            'message' => 'Profil desa berhasil diperbarui',
            'data' => new VillageResource($village),
        ]);
    }

    /**
     * POST /villages/profile/resolve-map-link: titik kantor dari link Google
     * Maps. Tidak menyimpan apa pun; hasilnya diisikan ke form lalu disimpan
     * lewat PATCH /villages/profile.
     */
    public function resolveMapLink(ResolveMapLinkRequest $request, GoogleMapsLinkResolver $resolver): JsonResponse
    {
        $coords = $resolver->resolve($request->validated('url'));

        if ($coords === null) {
            return response()->json([
                'message' => 'Titik lokasi tidak ditemukan dari link ini. Pastikan link dari Google Maps, atau tempel koordinatnya langsung.',
                'errors' => ['url' => ['Titik lokasi tidak ditemukan dari link ini.']],
            ], 422);
        }

        return response()->json(['data' => $coords]);
    }

    /**
     * POST /villages/profile/logo dan /villages/profile/hero-image; kolomnya
     * ditetapkan route lewat ->defaults('column', ...).
     */
    public function uploadImage(UploadVillageImageRequest $request, string $column): JsonResponse
    {
        $village = $this->service->replaceImage($request->user(), $column, $request->file('image'));

        return response()->json([
            'message' => $column === 'logo'
                ? 'Logo desa berhasil diperbarui.'
                : 'Foto beranda berhasil diperbarui.',
            'data' => new VillageResource($village),
        ]);
    }
}
