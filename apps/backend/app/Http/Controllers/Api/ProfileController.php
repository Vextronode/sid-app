<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileService;
use App\Services\UserService;
use App\Support\LetterFormSchema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        protected ProfileService $profileService,
        protected UserService $userService,
    ) {}

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->profileService->updateProfile($request->user(), $request->validated());

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => new UserResource($this->userService->getCurrentUserProfile($user)),
        ]);
    }

    /**
     * Anggota KK pemohon untuk isian family_members di form surat. NIK
     * disamarkan; pilihan yang dikirim divalidasi ulang saat pengajuan.
     */
    public function familyMembers(Request $request): JsonResponse
    {
        $citizen = $request->user()->citizen;
        $members = (new LetterFormSchema(null, $citizen))->familyMembers();

        return response()->json([
            'message' => 'Anggota keluarga berhasil diambil.',
            'data' => $members->map(fn ($member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'family_role' => $member->family_role?->value,
                'family_role_label' => LetterFormSchema::familyRoleLabel($member->family_role),
                // Isian family_member dapat dibatasi menurut jenis kelamin.
                'gender' => $member->gender,
                'nik_masked' => $member->nik ? str_repeat('*', max(strlen($member->nik) - 4, 0)).substr($member->nik, -4) : null,
                'is_self' => $member->id === $citizen?->id,
            ])->values(),
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $this->profileService->updatePassword($request->user(), $request->validated());

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui.',
            'user' => new UserResource($this->userService->getCurrentUserProfile($user)),
        ]);
    }
}
