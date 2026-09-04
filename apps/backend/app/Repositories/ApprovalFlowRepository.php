<?php

namespace App\Repositories;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

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

    public function findByCategoryId(int $categoryId): Collection
    {
        return ApprovalFlow::query()
            ->where('category_id', $categoryId)
            ->with('steps')
            ->get();
    }

    public function allActive(): Collection
    {
        return ApprovalFlow::query()
            ->where('is_active', true)
            ->with('steps')
            ->get();
    }

    /**
     * EV5-1-S2 (dipindah dari Controller ke Repository). Query eloquent
     * create() untuk entity ApprovalFlow HARUS lewat sini, bukan
     * dipanggil langsung dari Service/Controller.
     */
    public function create(array $attributes): ApprovalFlow
    {
        return ApprovalFlow::query()->create($attributes);
    }

    /**
     * EV5-1-S3 (dipindah dari Controller ke Repository). Replace-all
     * steps milik satu flow dalam 1 transaksi DB: hapus semua steps
     * lama, lalu buat steps baru dari $stepsData (array of attributes).
     * Query eloquent (delete/create) dan transaksi DB HARUS lewat sini
     * — Service hanya mengorkestrasi kapan method ini dipanggil.
     *
     * @param  array<int, array<string, mixed>>  $stepsData
     * @return Collection<int, FlowStep>
     */
    public function replaceSteps(ApprovalFlow $flow, array $stepsData): Collection
    {
        return DB::transaction(function () use ($flow, $stepsData) {
            $flow->steps()->delete();

            $created = collect($stepsData)->map(
                fn (array $step) => $flow->steps()->create($step),
            );

            return new Collection($created->all());
        });
    }
}
