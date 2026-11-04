<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadUserPhotoRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Foto profil akun warga: dihapus pemilik akun (/profile/photo), atau
 * diganti/dihapus Staf SIDUTama (/users/{user}/photo). Warga mengganti
 * fotonya lewat permintaan (ProfilePhotoRequestController). Lihat
 * UserPhotoService untuk aturan akun yang sedang menjabat.
 */
class UserPhotoController extends Controller
{
    public function __construct(
        private readonly UserPhotoService $service,
    ) {}

    public function destroyOwn(Request $request): JsonResponse
    {
        $user = $this->service->deleteOwn($request->user());

        return $this->respond($user, 'Foto profil berhasil dihapus.');
    }

    public function store(UploadUserPhotoRequest $request, User $user): JsonResponse
    {
        $user = $this->service->replaceFor($user, $request->user(), $request->file('photo'));

        return $this->respond($user, 'Foto profil berhasil disimpan.');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $user = $this->service->deleteFor($user, $request->user());

        return $this->respond($user, 'Foto profil berhasil dihapus.');
    }

    private function respond(User $user, string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'data' => new UserResource($user),
        ]);
    }
}
