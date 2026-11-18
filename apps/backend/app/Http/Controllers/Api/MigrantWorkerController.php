<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexMigrantWorkerRequest;
use App\Http\Resources\MigrantWorkerCollection;
use App\Http\Resources\MigrantWorkerResource;
use App\Models\MigrantWorker;
use App\Repositories\MigrantWorkerRepository;
use App\Services\MigrantWorkerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Data CPMI (baca saja) untuk petugas, riwayat CPMI milik warga, dan nilai
 * awal form pengajuan CPMI berikutnya.
 */
class MigrantWorkerController extends Controller
{
    public function __construct(
        protected MigrantWorkerRepository $migrantWorkerRepository,
        protected MigrantWorkerService $migrantWorkerService,
    ) {}

    public function index(IndexMigrantWorkerRequest $request)
    {
        $this->authorize('viewAny', MigrantWorker::class);

        $villageId = (string) $request->user()->village_id;

        return (new MigrantWorkerCollection(
            $this->migrantWorkerRepository->paginateForVillage($villageId, $request->validated()),
        ))->additional([
            'filters' => ['countries' => $this->migrantWorkerRepository->countriesForVillage($villageId)],
        ]);
    }

    public function show(MigrantWorker $migrantWorker)
    {
        $this->authorize('view', $migrantWorker);

        $migrantWorker->load([
            'citizen.rt.rw',
            'citizen.hamlet',
            'citizen.mother:id,name',
            'letter.hamlet:id,name',
            'letter.attachments',
        ]);

        return (new MigrantWorkerResource($migrantWorker))->withDetail();
    }

    /** Riwayat CPMI warga sendiri (users.citizen_id). */
    public function ownIndex(Request $request)
    {
        $citizenId = $request->user()->citizen_id;

        return new MigrantWorkerCollection(
            $citizenId === null ? collect() : $this->migrantWorkerRepository->allForCitizen($citizenId),
        );
    }

    /** Isian dari pengajuan CPMI terakhir warga sendiri, untuk form F11 berikutnya. */
    public function ownPrefill(Request $request): JsonResponse
    {
        return response()->json([
            'data' => (object) $this->migrantWorkerService->prefillFor($request->user()->citizen_id),
        ]);
    }
}
