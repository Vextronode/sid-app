<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddVillageOrgMemberRequest;
use App\Http\Requests\DestroyVillageOrgMemberRequest;
use App\Http\Requests\UpdateVillageOrgMemberRequest;
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
        $member = $this->service->addOrRotate($position, $request->validated());

        return (new VillageOrgMemberResource($member))->response()->setStatusCode(201);
    }

    public function update(UpdateVillageOrgMemberRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $member = $this->service->update($position, $id, $request->validated());

        return (new VillageOrgMemberResource($member))->response();
    }

    public function destroy(DestroyVillageOrgMemberRequest $request, VillageOrgPosition $position, int $id): JsonResponse
    {
        $this->service->delete($position, $id);

        return response()->json(['message' => 'Anggota organisasi berhasil dihapus']);
    }
}
