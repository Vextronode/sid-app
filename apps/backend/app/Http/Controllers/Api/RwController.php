<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DestroyRwRequest;
use App\Http\Requests\StoreRwRequest;
use App\Http\Requests\UpdateRwRequest;
use App\Http\Resources\RwCollection;
use App\Http\Resources\RwResource;
use App\Models\Rw;
use App\Services\RwService;
use Illuminate\Http\Request;

class RwController extends Controller
{
    public function __construct(protected RwService $rwService) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Rw::class);
        $hamletId = $request->filled('hamlet_id') ? (int) $request->query('hamlet_id') : null;

        return (new RwCollection($this->rwService->getAllOrderedByNumber($hamletId)))->response();
    }

    public function store(StoreRwRequest $request)
    {
        $this->authorize('create', Rw::class);
        $rw = $this->rwService->create($request->validated());

        return (new RwResource($rw))->response()->setStatusCode(201);
    }

    public function update(UpdateRwRequest $request, Rw $rw)
    {
        $this->authorize('update', $rw);
        $rw = $this->rwService->update($rw, $request->validated());

        return (new RwResource($rw))->response();
    }

    public function destroy(DestroyRwRequest $request, Rw $rw)
    {
        $this->authorize('delete', $rw);
        $this->rwService->delete($rw);

        return response()->json(['message' => 'RW berhasil dihapus.']);
    }
}
