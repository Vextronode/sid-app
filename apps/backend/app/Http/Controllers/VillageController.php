<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Citizen;
use Carbon\Carbon;
use App\Models\Letter;
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
    public function letterStats(Request $request)
    {
        $user = $request->user();

        $date = Carbon::parse(
            $request->get('date', now()->toDateString())
        );

        $baseQuery = Letter::where('village_id', $user->village_id);

        $letterType = $request->get('letter_type');

        if ($letterType && $letterType !== 'all') {
            $baseQuery->where('letter_type_id', $letterType);
        }

        $labels = [];
        $values = [];

        // Ambil minggu berdasarkan tanggal yang dipilih
        $startOfWeek = $date->copy()->startOfWeek(Carbon::MONDAY);

        $days = [
            'Sen',
            'Sel',
            'Rab',
            'Kam',
            'Jum',
            'Sab',
            'Min',
        ];

        foreach ($days as $i => $label) {

            $currentDate = $startOfWeek->copy()->addDays($i);

            $labels[] = $label;

            $values[] = (clone $baseQuery)
                ->whereDate('submitted_at', $currentDate)
                ->count();
        }

        // Maksimum sumbu Y
        $maxValue = max($values);

        $maxY = max(
            50,
            ceil($maxValue / 5) * 5
        );

        return response()->json([
            'chart' => [
                'labels' => $labels,
                'values' => $values,
                'maxY' => $maxY,
            ],
        ]);
    }
}
