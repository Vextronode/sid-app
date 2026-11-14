<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexCitizenBusinessRequest;
use App\Http\Resources\CitizenBusinessCollection;
use App\Http\Resources\CitizenBusinessResource;
use App\Models\CitizenBusiness;
use App\Services\CitizenBusinessService;
use Illuminate\Http\Request;

/**
 * Data Usaha Warga (baca saja, Staf SIDUTama dan petugas SKU) serta
 * Usaha Saya milik warga beserta pendaftaran Cimart-nya.
 */
class CitizenBusinessController extends Controller
{
    public function __construct(
        protected CitizenBusinessService $citizenBusinessService
    ) {}

    public function index(IndexCitizenBusinessRequest $request)
    {
        $this->authorize('viewAny', CitizenBusiness::class);

        return new CitizenBusinessCollection(
            $this->citizenBusinessService->paginateForVillage($request->user(), $request->validated()),
        );
    }

    public function show(CitizenBusiness $citizenBusiness)
    {
        $this->authorize('view', $citizenBusiness);

        return new CitizenBusinessResource($citizenBusiness->load(['citizen:id,name', 'letter:id,letter_number,expires_at']));
    }

    public function ownIndex(Request $request)
    {
        return new CitizenBusinessCollection($this->citizenBusinessService->forOwner($request->user()));
    }

    public function requestCimart(CitizenBusiness $citizenBusiness)
    {
        $this->authorize('requestCimart', $citizenBusiness);

        $business = $this->citizenBusinessService->requestCimart($citizenBusiness);

        return (new CitizenBusinessResource($business))
            ->additional(['message' => 'Usaha didaftarkan ke Cimart. Cimart akan memproses pendaftaran Anda.']);
    }

    public function cancelCimart(Request $request, CitizenBusiness $citizenBusiness)
    {
        $this->authorize('cancelCimart', $citizenBusiness);

        $business = $this->citizenBusinessService->cancelCimart($citizenBusiness, $request->user());

        return (new CitizenBusinessResource($business))
            ->additional(['message' => 'Pendaftaran Cimart dibatalkan.']);
    }
}
