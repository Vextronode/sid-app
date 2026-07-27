<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Citizen;
class VillageController extends Controller
{


public function genderStats(Request $request)
{
    $user = $request->user();

    $query = Citizen::where('village_id', $user->village_id);

    $laki = (clone $query)
        ->where('gender', 'L')
        ->count();

    $perempuan = (clone $query)
        ->where('gender', 'P')
        ->count();

    return response()->json([
        'total' => $laki + $perempuan,
        'laki' => $laki,
        'perempuan' => $perempuan,
    ]);
}
}
