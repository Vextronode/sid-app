<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Models\Rw;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

        $this->guardDeactivation($data, $hamlet, Citizen::where('hamlet_id', $hamlet->id), 'Dusun tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');

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
    // RWS
    // ==========================================

    public function indexRws(Request $request)
    {
        $query = Rw::query();

        if ($request->filled('hamlet_id')) {
            $query->where('hamlet_id', $request->query('hamlet_id'));
        }

        return response()->json([
            'data' => $query->orderBy('number')->get(),
        ]);
    }

    public function storeRw(Request $request)
    {
        $this->authorizePetugasDesa($request);

        $data = $request->validate([
            'hamlet_id' => 'required|exists:hamlets,id',
            'number' => [
                'required',
                'string',
                'max:10',
                Rule::unique('rws')->where(fn ($q) => $q->where('hamlet_id', $request->input('hamlet_id'))),
            ],
        ], [
            'number.unique' => 'RW dengan nomor ini sudah ada di dusun tersebut',
        ]);

        $rw = Rw::create([
            'hamlet_id' => $data['hamlet_id'],
            'number' => $data['number'],
            'full_label' => "RW {$data['number']}",
            'is_active' => true,
        ]);

        return response()->json(['data' => $rw], 201);
    }

    public function updateRw(Request $request, Rw $rw)
    {
        $this->authorizePetugasDesa($request);

        $data = $request->validate([
            'number' => [
                'sometimes',
                'string',
                'max:10',
                Rule::unique('rws')->where(fn ($q) => $q->where('hamlet_id', $rw->hamlet_id))->ignore($rw->id),
            ],
            'is_active' => 'sometimes|boolean',
        ], [
            'number.unique' => 'RW dengan nomor ini sudah ada di dusun tersebut',
        ]);

        $this->guardDeactivation($data, $rw, Citizen::where('rw_id', $rw->id), 'RW tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');

        if (isset($data['number'])) {
            $data['full_label'] = "RW {$data['number']}";
        }

        $rw->update($data);

        return response()->json(['data' => $rw]);
    }

    public function destroyRw(Request $request, Rw $rw)
    {
        $this->authorizePetugasDesa($request);

        if (Citizen::where('rw_id', $rw->id)->exists()) {
            abort(409, 'RW tidak bisa dihapus karena masih ada warga terdaftar di wilayah ini.');
        }

        $rw->delete();

        return response()->json(['message' => 'RW berhasil dihapus.']);
    }

    // ==========================================
    // RTS
    // ==========================================

    public function indexRts(Request $request)
    {
        $query = Rt::query();

        if ($request->filled('rw_id')) {
            $query->where('rw_id', $request->query('rw_id'));
        }

        return response()->json([
            'data' => $query->orderBy('number')->get(),
        ]);
    }

    public function storeRt(Request $request)
    {
        $this->authorizePetugasDesa($request);

        $data = $request->validate([
            'rw_id' => 'required|exists:rws,id',
            'number' => [
                'required',
                'string',
                'max:10',
                Rule::unique('rts')->where(fn ($q) => $q->where('rw_id', $request->input('rw_id'))),
            ],
        ], [
            'number.unique' => 'RT dengan nomor ini sudah ada di RW tersebut',
        ]);

        $rw = Rw::findOrFail($data['rw_id']);

        $rt = Rt::create([
            'rw_id' => $data['rw_id'],
            'number' => $data['number'],
            'full_label' => "RT {$data['number']} / RW {$rw->number}",
            'is_active' => true,
        ]);

        return response()->json(['data' => $rt], 201);
    }

    public function updateRt(Request $request, Rt $rt)
    {
        $this->authorizePetugasDesa($request);

        $data = $request->validate([
            'number' => [
                'sometimes',
                'string',
                'max:10',
                Rule::unique('rts')->where(fn ($q) => $q->where('rw_id', $rt->rw_id))->ignore($rt->id),
            ],
            'is_active' => 'sometimes|boolean',
        ], [
            'number.unique' => 'RT dengan nomor ini sudah ada di RW tersebut',
        ]);

        $this->guardDeactivation($data, $rt, Citizen::where('rt_id', $rt->id), 'RT tidak bisa dinonaktifkan karena masih ada warga aktif terdaftar di wilayah ini.');

        if (isset($data['number'])) {
            $rt->loadMissing('rw');
            $data['full_label'] = "RT {$data['number']} / RW {$rt->rw->number}";
        }

        $rt->update($data);

        return response()->json(['data' => $rt]);
    }

    public function destroyRt(Request $request, Rt $rt)
    {
        $this->authorizePetugasDesa($request);

        if (Citizen::where('rt_id', $rt->id)->exists()) {
            abort(409, 'RT tidak bisa dihapus karena masih ada warga terdaftar di wilayah ini.');
        }

        $rt->delete();

        return response()->json(['message' => 'RT berhasil dihapus.']);
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

    private function guardDeactivation(array $data, $region, $citizenQuery, string $message)
    {
        $isDeactivating = array_key_exists('is_active', $data)
            && ! $data['is_active']
            && $region->is_active;

        if ($isDeactivating && $citizenQuery->where('is_active', true)->exists()) {
            abort(409, $message);
        }
    }
}
