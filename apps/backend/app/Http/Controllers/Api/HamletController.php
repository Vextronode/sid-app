<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHamletRequest;
use App\Http\Requests\UpdateHamletRequest;
use App\Http\Resources\HamletCollection;
use App\Http\Resources\HamletResource;
use App\Models\Hamlet;
use App\Services\HamletService;

class HamletController extends Controller
{
    public function __construct(protected HamletService $hamletService) {}

    public function index()
    {
        $this->authorize('viewAny', Hamlet::class);

        return (new HamletCollection($this->hamletService->getAllOrderedByName()))->response();
    }

    public function store(StoreHamletRequest $request)
    {
        $this->authorize('create', Hamlet::class);
        $hamlet = $this->hamletService->create($request->validated(), $request->user());

        return (new HamletResource($hamlet))->response()->setStatusCode(201);
    }

    public function update(UpdateHamletRequest $request, Hamlet $hamlet)
    {
        $this->authorize('update', $hamlet);
        $hamlet = $this->hamletService->update($hamlet, $request->validated());

        return (new HamletResource($hamlet))->response();
    }

    public function destroy(Hamlet $hamlet)
    {
        $this->authorize('delete', $hamlet);
        $this->hamletService->delete($hamlet);

        return response()->json(['message' => 'Dusun berhasil dihapus.']);
    }
}
