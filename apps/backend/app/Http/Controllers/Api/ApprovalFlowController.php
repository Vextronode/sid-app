<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\ReplaceApprovalFlowStepsRequest;
use App\Http\Requests\StoreApprovalFlowRequest;
use App\Http\Resources\ApprovalFlowCollection;
use App\Http\Resources\ApprovalFlowResource;
use App\Http\Resources\FlowStepResource;
use App\Services\ApprovalFlowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalFlowController
{
    public function __construct(
        private readonly ApprovalFlowService $service,
    ) {
        //
    }

    public function index(Request $request): JsonResponse
    {
        $categoryId = $request->integer('category_id') ?: null;

        $flows = $this->service->list($categoryId);

        return (new ApprovalFlowCollection($flows))->response();
    }

    public function show(int $id): JsonResponse
    {
        $flow = $this->service->findWithStepsOrFail($id);

        return (new ApprovalFlowResource($flow))->response();
    }

    public function store(StoreApprovalFlowRequest $request): JsonResponse
    {
        $flow = $this->service->create($request->validated());

        return (new ApprovalFlowResource($flow))->response()->setStatusCode(201);
    }

    public function replaceSteps(ReplaceApprovalFlowStepsRequest $request, int $id): JsonResponse
    {
        $steps = $this->service->replaceSteps($id, $request->validated('steps'));

        return response()->json([
            'message' => 'Urutan approval berhasil diperbarui',
            'data' => FlowStepResource::collection($steps),
        ]);
    }
}
