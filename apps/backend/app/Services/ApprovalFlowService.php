<?php

namespace App\Services;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\User;
use App\Repositories\ApprovalFlowRepository;
use Illuminate\Database\Eloquent\Collection;

class ApprovalFlowService
{
    public function __construct(
        private readonly ApprovalFlowRepository $repository,
    ) {}

    public function list(User $user, ?int $categoryId): Collection
    {
        return $this->repository->allForVillage($this->villageId($user), $categoryId);
    }

    public function findWithStepsOrFail(int $id, User $user): ApprovalFlow
    {
        $flow = $this->repository->findWithStepsForVillage($id, $this->villageId($user));

        if (! $flow) {
            abort(404, 'Flow tidak ditemukan.');
        }

        return $flow;
    }

    public function create(array $attributes, User $user): ApprovalFlow
    {
        $attributes['village_id'] = $this->villageId($user);

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
    public function replaceSteps(int $flowId, array $stepsData, User $user): Collection
    {
        $flow = $this->repository->findByIdForVillage($flowId, $this->villageId($user));

        if (! $flow) {
            abort(404, 'Flow tidak ditemukan.');
        }

        return $this->repository->replaceSteps($flow, $stepsData);
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
