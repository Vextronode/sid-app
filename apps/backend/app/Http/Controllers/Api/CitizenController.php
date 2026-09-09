<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CitizenCollection;
use App\Models\Citizen;
use App\Services\CitizenService;

class CitizenController extends Controller
{
    public function __construct(
        protected CitizenService $citizenService
    ) {}

    public function index()
    {
        $citizens = $this->citizenService->getAllWithWilayah();

        return (new CitizenCollection($citizens))->response()->setStatusCode(200);
    }

    public function destroy(Citizen $citizen)
    {
        $this->citizenService->delete($citizen);

        return response()->json([
            'message' => 'Data warga berhasil dihapus.',
        ])->setStatusCode(200);
    }

    public function wilayah()
    {
        $citizens = $this->citizenService->getDistinctWilayah();

        return (new CitizenCollection($citizens))->response()->setStatusCode(200);
    }
}
