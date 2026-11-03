<?php

namespace App\Http\Resources;

use App\Models\ProfilePhotoRequest;
use App\Models\User;
use App\Services\ProfilePhotoRequestService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Satu permintaan ganti foto profil untuk daftar petugas. Hak setujui/tolak
 * dihitung untuk petugas yang melihat.
 *
 * @property ProfilePhotoRequest $resource
 */
class ProfilePhotoRequestResource extends JsonResource
{
    public function __construct(
        ProfilePhotoRequest $resource,
        private readonly User $viewer,
        private readonly ProfilePhotoRequestService $service,
    ) {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $photoRequest = $this->resource;
        $pending = $photoRequest->isPending();
        $nik = $photoRequest->citizen?->nik;
        $currentPhoto = $photoRequest->user?->photo_img;

        return [
            'id' => $photoRequest->id,
            'status' => $photoRequest->status,
            'user' => [
                'name' => $photoRequest->user?->name ?? $photoRequest->citizen?->name,
                'username' => $photoRequest->user?->username,
                'nik_masked' => $nik ? str_repeat('*', 12).substr($nik, -4) : null,
                // Foto profil yang sedang terpasang, untuk dibandingkan.
                'current_photo_url' => $currentPhoto ? Storage::disk('public')->url($currentPhoto) : null,
            ],
            'area' => [
                'rt' => $photoRequest->rt?->number,
                'rw' => $photoRequest->rw?->number,
                'hamlet' => $photoRequest->hamlet?->name,
            ],
            // Menunggu: jenjang yang saat ini memegang; diputuskan: jenjang yang memutuskan.
            'level' => $pending ? $this->service->route($photoRequest)['level'] : $photoRequest->decided_level,
            'can_decide' => $pending && $this->service->canDecide($this->viewer, $photoRequest),
            // Foto hanya selama diproses atau setelah ditolak.
            'has_photo' => $photoRequest->photo_path !== null,
            'decided_by' => $photoRequest->decider?->name,
            'decided_at' => $photoRequest->decided_at,
            'decision_notes' => $photoRequest->decision_notes,
            'created_at' => $photoRequest->created_at,
        ];
    }
}
