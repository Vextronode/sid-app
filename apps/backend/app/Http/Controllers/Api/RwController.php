<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRwRequest;
use App\Http\Requests\UpdateRwRequest;
use App\Http\Resources\RwCollection;
use App\Http\Resources\RwResource;
use App\Models\Rw;
use App\Services\RwService;
use Illuminate\Http\Request;

class RwController extends Controller
{
    public function __construct(
        protected RwService $rwService
    ) {}

    public function index(Request $request)
    {
        $hamletId = $request->filled('hamlet_id') ? (int) $request->query('hamlet_id') : null;

        $rws = $this->rwService->getAllOrderedByNumber($hamletId);

        return (new RwCollection($rws))->response()->setStatusCode(200);
    }

    public function store(StoreRwRequest $request)
    {
        $rw = $this->rwService->create($request->validated());

        return (new RwResource($rw))->response()->setStatusCode(201);
    }

    public function update(UpdateRwRequest $request, Rw $rw)
    {
        $rw = $this->rwService->update($rw, $request->validated());

        return (new RwResource($rw))->response()->setStatusCode(200);
    }

    public function destroy(Request $request, Rw $rw)
    {
        if ($request->user()->role !== 'petugas_desa') {
            abort(403, 'Hanya Petugas Desa yang berwenang.');
        }

        $this->rwService->delete($rw);

        return response()->json([
            'message' => 'RW berhasil dihapus.',
        ])->setStatusCode(200);
    }
}
