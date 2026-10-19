<?php

namespace App\Http\Controllers\Api;

use App\Exports\CitizensTemplateExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\ImportCitizensRequest;
use App\Http\Requests\IndexCitizenRequest;
use App\Http\Requests\StoreCitizenRequest;
use App\Http\Requests\UpdateCitizenRequest;
use App\Http\Resources\CitizenCollection;
use App\Http\Resources\CitizenResource;
use App\Models\Citizen;
use App\Services\CitizenService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class CitizenController extends Controller
{
    public function __construct(
        protected CitizenService $citizenService
    ) {}

    public function index(IndexCitizenRequest $request)
    {
        $citizens = $this->citizenService->paginateWithWilayah($request->user(), $request->validated());

        return (new CitizenCollection($citizens))->response()->setStatusCode(200);
    }

    public function store(StoreCitizenRequest $request)
    {
        $citizen = $this->citizenService->create($request->validated(), $request->user());

        return response()->json([
            'message' => 'Data warga berhasil disimpan',
            'data' => new CitizenResource($citizen),
        ], 201);
    }

    public function update(UpdateCitizenRequest $request, Citizen $citizen)
    {
        $citizen = $this->citizenService->update($citizen, $request->validated(), $request->user());

        return response()->json([
            'data' => new CitizenResource($citizen),
        ]);
    }

    public function import(ImportCitizensRequest $request)
    {
        $result = $this->citizenService->importFromExcel(
            $request->file('file'),
            $request->user()
        );

        return response()->json([
            'message' => 'Import selesai diproses',
            'data' => $result,
        ]);
    }

    /**
     * Template Excel impor warga; header mengikuti CitizensImport.
     */
    public function importTemplate()
    {
        return Excel::download(new CitizensTemplateExport, 'template_impor_warga.xlsx');
    }

    public function destroy(Request $request, Citizen $citizen)
    {
        $this->citizenService->delete($citizen, $request->user());

        return response()->json([
            'message' => 'Data warga berhasil dihapus.',
        ])->setStatusCode(200);
    }

    public function wilayah(Request $request)
    {
        $citizens = $this->citizenService->getDistinctWilayah($request->user());

        return (new CitizenCollection($citizens))->response()->setStatusCode(200);
    }
}
