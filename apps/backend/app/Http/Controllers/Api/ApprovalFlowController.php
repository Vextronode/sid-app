<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApprovalFlowCollection;
use App\Http\Resources\ApprovalFlowResource;
use App\Services\ApprovalFlowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalFlowController extends Controller
{
    public function __construct(
        private readonly ApprovalFlowService $service,
    ) {
        //
    }

    public function index(Request $request): JsonResponse
    {
        $flows = $this->service->list($request->user());

        return (new ApprovalFlowCollection($flows))->response();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $flow = $this->service->findWithStepsOrFail($id, $request->user());

        return (new ApprovalFlowResource($flow))->response();
    }
}
