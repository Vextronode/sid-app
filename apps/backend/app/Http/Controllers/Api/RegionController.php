<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Citizen;
use App\Models\Hamlet;
use Illuminate\Http\Request;

class RegionController extends Controller
{
    // ==========================================
    // HAMLETS
    // ==========================================

    public function indexHamlets()
    {
        return response()->json([
            'data' => Hamlet::orderBy('name')->get(),
        ]);
    }

    public function storeHamlet(Request $request)
    {
        $this->authorizePetugasDesa($request);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:hamlets,code',
        ], [
            'code.unique' => 'Kode dusun sudah digunakan',
        ]);

        $hamlet = Hamlet::create([
            'name' => $data['name'],
            'code' => $data['code'],
            'village_id' => $request->user()->village_id,
            'is_active' => true,
        ]);

        return response()->json(['data' => $hamlet], 201);
    }

    public function updateHamlet(Request $request, Hamlet $hamlet)
    {
        $this->authorizePetugasDesa($request);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $this->guardDeactivation($data, $hamlet, Citizen::where('hamlet_id', $hamlet->id));

        $hamlet->update($data);

        return response()->json(['data' => $hamlet]);
    }

    public function destroyHamlet(Request $request, Hamlet $hamlet)
    {
        $this->authorizePetugasDesa($request);

        $citizenQuery = Citizen::where('hamlet_id', $hamlet->id);

        if ($citizenQuery->exists()) {
            abort(409, 'Dusun tidak bisa dihapus karena masih ada warga terdaftar di wilayah ini.');
        }

        $hamlet->delete();

        return response()->json(['message' => 'Dusun berhasil dihapus.']);
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private function authorizePetugasDesa(Request $request)
    {
        if ($request->user()->role !== 'petugas_desa') {
            abort(403, 'Hanya Petugas Desa yang berwenang.');
        }
    }

    private function guardDeactivation(array $data, $region, $citizenQuery)
    {
        $isDeactivating = array_key_exists('is_active', $data)
            && !$data['is_active']
            && $region->is_active;

        if ($isDeactivating && $citizenQuery->where('is_active', true)->exists()) {
            abort(409, 'Dusun tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');
        }
    }
}
