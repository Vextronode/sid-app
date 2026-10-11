<?php

namespace App\Services;

use App\Models\ApprovalFlow;
use App\Models\User;
use App\Repositories\ApprovalFlowRepository;
use Illuminate\Database\Eloquent\Collection;

class ApprovalFlowService
{
    public function __construct(
        private readonly ApprovalFlowRepository $repository,
    ) {}

    public function list(User $user): Collection
    {
        return $this->repository->allForVillage($this->villageId($user));
    }

    public function findWithStepsOrFail(int $id, User $user): ApprovalFlow
    {
        $flow = $this->repository->findWithStepsForVillage($id, $this->villageId($user));

        if (! $flow) {
            abort(404, 'Flow tidak ditemukan.');
        }

        return $flow;
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'petugas_desa' || ! $user->is_active || ! $user->village_id) {
            abort(403, 'Petugas Desa aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
