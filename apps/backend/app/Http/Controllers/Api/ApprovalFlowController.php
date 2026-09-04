<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreApprovalFlowRequest;
use App\Services\ApprovalFlowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalFlowController
{
    /**
     * Create a new class instance.
     */
    public function __construct(
        private readonly ApprovalFlowService $service,
    )
    {
        //
    }

    public function index(Request $request): JsonResponse
    {
        $categoryId = $request->integer('category_id') ?: null;

        $flows = $this->service->list($categoryId);

        return response()->json(['data' => $flows]);
    }

    public function show(int $id): JsonResponse
    {
        $flow = $this->service->findWithStepsOrFail($id);

        return response()->json(['data' => $flow]);
    }

    public function store(StoreApprovalFlowRequest $request): JsonResponse
    {
        $flow = $this->service->create($request->validated());

        return response()->json(['data' => $flow], 201);
    }

}
