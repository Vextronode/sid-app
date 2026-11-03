<?php

namespace App\Observers;

use App\Services\PopulationAuditService;
use App\Support\AuditContext;
use Illuminate\Database\Eloquent\Model;

/**
 * Jejak audit otomatis untuk Citizen, Family, dan FamilySocioeconomic:
 * setiap penyimpanan lewat Eloquent tercatat tanpa pemanggilan manual.
 * Mass update/delete melewati observer ini dan dilarang oleh
 * EloquentOnlyWritesTest.
 */
class PopulationAuditObserver
{
    public function __construct(
        private readonly PopulationAuditService $audit,
        private readonly AuditContext $context,
    ) {}

    public function created(Model $model): void
    {
        if (! $this->context->isMuted()) {
            $this->audit->created($model);
        }
    }

    public function updated(Model $model): void
    {
        if (! $this->context->isMuted()) {
            $this->audit->updated($model);
        }
    }

    public function deleted(Model $model): void
    {
        if (! $this->context->isMuted()) {
            $this->audit->deleted($model);
        }
    }
}
