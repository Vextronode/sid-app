<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRtRequest;
use App\Http\Requests\UpdateRtRequest;
use App\Http\Resources\RtCollection;
use App\Http\Resources\RtResource;
use App\Models\Rt;
use App\Services\RtService;
use Illuminate\Http\Request;

class RtController extends Controller
{
    public function __construct(
        protected RtService $rtService
    ) {}

    public function index(Request $request)
    {
        $rwId = $request->filled('rw_id') ? (int) $request->query('rw_id') : null;

        $rts = $this->rtService->getAllOrderedByNumber($rwId);

        return (new RtCollection($rts))->response()->setStatusCode(200);
    }

    public function store(StoreRtRequest $request)
    {
        $rt = $this->rtService->create($request->validated());

        return (new RtResource($rt))->response()->setStatusCode(201);
    }

    public function update(UpdateRtRequest $request, Rt $rt)
    {
        $rt = $this->rtService->update($rt, $request->validated());

        return (new RtResource($rt))->response()->setStatusCode(200);
    }

    public function destroy(Request $request, Rt $rt)
    {
        if ($request->user()->role !== 'petugas_desa') {
            abort(403, 'Hanya Petugas Desa yang berwenang.');
        }

        $this->rtService->delete($rt);

        return response()->json([
            'message' => 'RT berhasil dihapus.',
        ])->setStatusCode(200);
    }
}
