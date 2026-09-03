<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Citizen;

class CitizenController extends Controller
{
    public function index()
    {
        return Citizen::with([
            'rt',
            'rw',
            'hamlet',
            'village',
        ])
            ->orderBy('name')
            ->get();
    }

    public function destroy(Citizen $citizen)
    {
        $citizen->delete();

        return response()->json([
            'message' => 'Data warga berhasil dihapus.',
        ]);
    }

    public function wilayah()
    {
        return Citizen::with([
            'rt',
            'rw',
        ])
            ->select('rt_id', 'rw_id')
            ->distinct()
            ->get();
    }
}
