<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectProfilePhotoRequestRequest;
use App\Http\Requests\StoreProfilePhotoRequestRequest;
use App\Http\Resources\ProfilePhotoRequestResource;
use App\Models\ProfilePhotoRequest;
use App\Services\ProfilePhotoRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Permintaan ganti foto profil: diajukan warga (/profile/photo-request) dan
 * diputuskan RT, RW, Kepala Dusun, atau Staf SIDUTama
 * (/profile-photo-requests). Wewenang diatur ProfilePhotoRequestService.
 */
class ProfilePhotoRequestController extends Controller
{
    public function __construct(
        protected ProfilePhotoRequestService $service,
    ) {}

    /**
     * Permintaan terakhir milik akun yang login, untuk status di halaman Profil.
     */
    public function showOwn(Request $request): JsonResponse
    {
        $latest = $this->service->latestFor($request->user());

        return response()->json([
            'data' => $latest ? [
                'id' => $latest->id,
                'status' => $latest->status,
                'decision_notes' => $latest->decision_notes,
                'decided_at' => $latest->decided_at,
                'created_at' => $latest->created_at,
            ] : null,
        ]);
    }

    public function storeOwn(StoreProfilePhotoRequestRequest $request): JsonResponse
    {
        $this->service->submit($request->user(), $request->file('photo'));

        return response()->json([
            'message' => 'Permintaan ganti foto terkirim. Foto terpasang setelah disetujui petugas wilayah.',
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([
                ProfilePhotoRequest::STATUS_PENDING,
                ProfilePhotoRequest::STATUS_APPROVED,
                ProfilePhotoRequest::STATUS_REJECTED,
            ])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $photoRequests = $this->service->paginateFor($request->user(), $filters);

        return response()->json([
            'data' => $photoRequests->getCollection()->map(
                fn (ProfilePhotoRequest $photoRequest) => new ProfilePhotoRequestResource($photoRequest, $request->user(), $this->service),
            ),
            'meta' => [
                'current_page' => $photoRequests->currentPage(),
                'per_page' => $photoRequests->perPage(),
                'total' => $photoRequests->total(),
                'last_page' => $photoRequests->lastPage(),
            ],
        ]);
    }

    public function photo(Request $request, ProfilePhotoRequest $profilePhotoRequest): StreamedResponse
    {
        return $this->service->photo($request->user(), $profilePhotoRequest);
    }

    public function approve(Request $request, ProfilePhotoRequest $profilePhotoRequest): JsonResponse
    {
        $this->service->approve($request->user(), $profilePhotoRequest);

        return response()->json(['message' => 'Foto profil warga diganti.']);
    }

    public function reject(RejectProfilePhotoRequestRequest $request, ProfilePhotoRequest $profilePhotoRequest): JsonResponse
    {
        $this->service->reject($request->user(), $profilePhotoRequest, $request->validated('notes'));

        return response()->json(['message' => 'Permintaan ganti foto ditolak.']);
    }
}
