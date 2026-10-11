<?php

namespace App\Repositories;

use App\Models\ApprovalFlow;
use Illuminate\Database\Eloquent\Collection;

class ApprovalFlowRepository
{
    public function __construct()
    {
        //
    }

    public function findById(int $id): ?ApprovalFlow
    {
        return ApprovalFlow::query()->find($id);
    }

    public function findWithSteps(int $id): ?ApprovalFlow
    {
        return ApprovalFlow::query()->with('steps')->find($id);
    }

    public function allActive(): Collection
    {
        return ApprovalFlow::query()
            ->where('is_active', true)
            ->with('steps')
            ->get();
    }

    public function allForVillage(string $villageId): Collection
    {
        return ApprovalFlow::query()
            ->where('village_id', $villageId)
            ->where('is_active', true)
            ->with('steps')
            ->get();
    }

    public function findWithStepsForVillage(int $id, string $villageId): ?ApprovalFlow
    {
        return ApprovalFlow::query()->where('village_id', $villageId)->with('steps')->find($id);
    }

    public function findByIdForVillage(int $id, string $villageId): ?ApprovalFlow
    {
        return ApprovalFlow::query()->where('village_id', $villageId)->find($id);
    }
}
