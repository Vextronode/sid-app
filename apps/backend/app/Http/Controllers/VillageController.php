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
 
$period = $request->get('period', 'week');

$week = (int) $request->get('week', 1);
$month = (int) $request->get('month', now()->month);
$year = (int) $request->get('year', now()->year);

$baseQuery = Letter::where('village_id', $user->village_id);

$letterType = $request->get('letter_type');

if ($letterType && $letterType !== 'all') {
    $baseQuery->where('letter_type_id', $letterType);
}

$labels = [];
$values = [];



    switch ($period) {


case 'week':

    $startOfMonth = Carbon::create($year, $month, 1);

    $weekStart = $startOfMonth
        ->copy()
        ->addDays(($week - 1) * 7);

    $days = [
        'Sen',
        'Sel',
        'Rab',
        'Kam',
        'Jum',
        'Sab',
        'Min'
    ];

    foreach ($days as $i => $day) {

        $date = $weekStart->copy()->addDays($i);

        $labels[] = $day;

        $values[] = (clone $baseQuery)
            ->whereDate('submitted_at', $date)
            ->count();
    }

break;


case 'month':

    $start = Carbon::create($year, $month, 1);

    $weeks = ceil($start->daysInMonth / 7);

    for ($i = 0; $i < $weeks; $i++) {

        $weekStart = $start
            ->copy()
            ->addDays($i * 7);

        $weekEnd = $weekStart
            ->copy()
            ->endOfDay()
            ->addDays(6);

        $labels[] = "Minggu " . ($i + 1);

        $values[] = (clone $baseQuery)
            ->whereBetween('submitted_at', [
                $weekStart,
                $weekEnd
            ])
            ->count();
    }

break;


case 'year':

    $labels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des'
    ];

    for ($i = 1; $i <= 12; $i++) {

        $values[] = (clone $baseQuery)
            ->whereYear('submitted_at', $year)
            ->whereMonth('submitted_at', $i)
            ->count();
    }

break;


        default:

            return response()->json([
                'message' => 'Invalid period'
            ], 400);

    }


    /*
    |--------------------------------------------------------------------------
    | Dynamic Y Axis
    |--------------------------------------------------------------------------
    */

    $maxValue = max($values);


    $maxY = max(
        50,
        ceil($maxValue / 5) * 5
    );


    return response()->json([

        'chart' => [

            'labels' => $labels,

            'values' => $values,

            'maxY' => $maxY

        ]

    ]);
}
}
