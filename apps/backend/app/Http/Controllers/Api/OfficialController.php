<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DemoteOfficialRequest;
use App\Http\Requests\PromoteOfficialRequest;
use App\Http\Requests\RotateOfficialRequest;
use App\Http\Requests\StoreOfficialRequest;
use App\Http\Requests\UpdateOfficialRequest;
use App\Http\Resources\OfficialCollection;
use App\Http\Resources\OfficialResource;
use App\Models\Official;
use App\Services\OfficialAssignmentService;
use App\Services\OfficialService;

class OfficialController extends Controller
{
    public function __construct(
        protected OfficialService $officialService,
        protected OfficialAssignmentService $assignmentService,
    ) {}

    public function index()
    {
        $this->authorize('viewAny', Official::class);

        $officials = $this->officialService->getAllWithRelations(request()->user());

        return (new OfficialCollection($officials))->response()->setStatusCode(200);
    }

    public function show(Official $official)
    {
        $this->authorize('view', $official);

        $official = $this->officialService->getForShow($official->id, request()->user());

        return (new OfficialResource($official))->response()->setStatusCode(200);
    }

    public function store(StoreOfficialRequest $request)
    {
        $this->authorize('create', Official::class);

        $official = $this->officialService->create($request->validated(), $request->user());

        return (new OfficialResource($official))->response()->setStatusCode(201);
    }

    public function update(UpdateOfficialRequest $request, Official $official)
    {
        $this->authorize('update', $official);

        $official = $this->officialService->update($official, $request->validated(), $request->user());

        return (new OfficialResource($official))->response()->setStatusCode(200);
    }

    public function promote(PromoteOfficialRequest $request)
    {
        $this->authorize('create', Official::class);

        $official = $this->assignmentService->promote($request->user(), $request->validated());

        return (new OfficialResource($official->load(['citizen', 'user'])))->response()->setStatusCode(201);
    }

    public function demote(DemoteOfficialRequest $request, Official $official)
    {
        $this->authorize('update', $official);

        $result = $this->assignmentService->demote(
            $request->user(),
            $official,
            $request->validated()['notes'] ?? null,
        );

        return response()->json([
            'message' => 'Jabatan berhasil diturunkan.',
            'data' => new OfficialResource($result['official']->load(['citizen', 'user'])),
            'warnings' => $result['warnings'],
        ]);
    }

    public function rotate(RotateOfficialRequest $request, Official $official)
    {
        $this->authorize('update', $official);

        $result = $this->assignmentService->rotate($request->user(), $official, $request->validated());

        return response()->json([
            'message' => 'Rotasi jabatan berhasil diproses',
            'data' => [
                'old_official' => new OfficialResource($result['old_official']),
                'new_official' => new OfficialResource($result['new_official']),
            ],
            'warnings' => $result['warnings'],
        ]);
    }

    public function destroy(Official $official)
    {
        $this->authorize('delete', $official);

        $this->officialService->delete($official);

        return response()->json([
            'message' => 'Data pejabat berhasil dihapus.',
        ])->setStatusCode(200);
    }
}
