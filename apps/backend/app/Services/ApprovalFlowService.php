<?php

namespace App\Services;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Repositories\ApprovalFlowRepository;
use Illuminate\Database\Eloquent\Collection;

class ApprovalFlowService
{
    public function __construct(
        private readonly ApprovalFlowRepository $repository,
    ) {}

    public function list(?int $categoryId): Collection
    {
        return $categoryId
            ? $this->repository->findByCategoryId($categoryId)
            : $this->repository->allActive();
    }

    public function findWithStepsOrFail(int $id): ApprovalFlow
    {
        $flow = $this->repository->findWithSteps($id);

        if (! $flow) {
            abort(404, 'Flow tidak ditemukan.');
        }

        return $flow;
    }

    public function create(array $attributes): ApprovalFlow
    {
        return $this->repository->create($attributes);
    }

    /**
     * PUT /approval-flows/{id}/steps — replace-all (bukan partial patch)
     * karena step_order antar step saling bergantung.
     *
     * Validasi struktural (ENUM approver_position, minimal 1 is_final,
     * step_order unik) sudah dijamin di ReplaceApprovalFlowStepsRequest.
     * Method ini menangani orkestrasi bisnis: pastikan flow ada (404
     * jika tidak), lalu delegasikan operasi replace ke Repository.
     *
     * @param  array<int, array<string, mixed>>  $stepsData
     * @return Collection<int, FlowStep>
     */
    public function replaceSteps(int $flowId, array $stepsData): Collection
    {
        $flow = $this->repository->findById($flowId);

        if (! $flow) {
            abort(404, 'Flow tidak ditemukan.');
        }

        return $this->repository->replaceSteps($flow, $stepsData);
    }
}
