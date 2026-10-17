<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddVillageOrgMemberRequest;
use App\Http\Requests\DestroyVillageOrgMemberRequest;
use App\Http\Requests\EndVillageOrgMemberRequest;
use App\Http\Requests\UpdateVillageOrgMemberRequest;
use App\Http\Requests\UploadVillageOrgMemberPhotoRequest;
use App\Http\Resources\VillageOrgMemberResource;
use App\Models\VillageOrgPosition;
use App\Services\VillageOrgMemberService;
use Illuminate\Http\JsonResponse;

class VillageOrgMemberController extends Controller
{
    public function __construct(
        private readonly VillageOrgMemberService $service,
    ) {}

    /**
     * POST /village-org-positions/{positionId}/members
     * (addVillageOrgMember, api_spec paths/village-org/members.yaml)
     */
    public function store(AddVillageOrgMemberRequest $request, VillageOrgPosition $position): JsonResponse
    {
        $member = $this->service->addOrRotate($request->user(), $position, $request->validated());

        return (new VillageOrgMemberResource($member))->response()->setStatusCode(201);
    }

    public function update(UpdateVillageOrgMemberRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $member = $this->service->update($request->user(), $position, $id, $request->validated());

        return (new VillageOrgMemberResource($member))->response();
    }

    /**
     * POST /village-org-positions/{positionId}/members/{id}/end
     * Mengosongkan slot Ketua/Wakil Ketua, opsional menurunkan jadi Anggota.
     */
    public function end(EndVillageOrgMemberRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $member = $this->service->end($request->user(), $position, $id, $request->validated());

        return (new VillageOrgMemberResource($member))->response();
    }

    /**
     * POST /village-org-positions/{positionId}/members/{id}/photo
     * Unggah atau ganti foto profil (multipart, field "photo").
     */
    public function uploadPhoto(UploadVillageOrgMemberPhotoRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $member = $this->service->replacePhoto($request->user(), $position, $id, $request->file('photo'));

        return (new VillageOrgMemberResource($member))->response();
    }

    /**
     * DELETE /village-org-positions/{positionId}/members/{id}/photo
     */
    public function destroyPhoto(DestroyVillageOrgMemberRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $member = $this->service->deletePhoto($request->user(), $position, $id);

        return (new VillageOrgMemberResource($member))->response();
    }

    public function destroy(DestroyVillageOrgMemberRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $this->service->delete($request->user(), $position, $id);

        return response()->json(['message' => 'Anggota organisasi berhasil dihapus']);
    }
}
