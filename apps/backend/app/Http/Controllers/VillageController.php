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

    $period = $request->get('period', 'day');

    $baseQuery = Letter::where(
        'village_id',
        $user->village_id
    );

    $labels = [];
    $values = [];

    switch ($period) {

        case 'day':

            $labels = [
                'Sen',
                'Sel',
                'Rab',
                'Kam',
                'Jum',
                'Sab',
                'Min'
            ];

            foreach ($labels as $i => $label) {

                $date = Carbon::now('Asia/Jakarta')
                    ->startOfWeek()
                    ->addDays($i);

                $values[] = (clone $baseQuery)
                    ->whereDate(
                        'submitted_at',
                        $date
                    )
                    ->count();
            }

            break;


        case 'week':

            $start = Carbon::now('Asia/Jakarta')
                ->startOfMonth();

            $totalWeek = ceil(
                $start->daysInMonth / 7
            );


            for ($i = 0; $i < $totalWeek; $i++) {


                $weekStart = $start
                    ->copy()
                    ->addDays($i * 7);


                $weekEnd = $weekStart
                    ->copy()
                    ->addDays(6);


                $labels[] = "Minggu ".($i + 1);


                $values[] = (clone $baseQuery)
                    ->whereBetween(
                        'submitted_at',
                        [
                            $weekStart,
                            $weekEnd
                        ]
                    )
                    ->count();
            }

            break;


        case 'month':

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
                    ->whereYear(
                        'submitted_at',
                        now()->year
                    )
                    ->whereMonth(
                        'submitted_at',
                        $i
                    )
                    ->count();
            }

            break;



        case 'year':

            $currentYear = now()->year;


            for (
                $year = $currentYear - 4;
                $year <= $currentYear;
                $year++
            ) {


                $labels[] = $year;


                $values[] = (clone $baseQuery)
                    ->whereYear(
                        'submitted_at',
                        $year
                    )
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
