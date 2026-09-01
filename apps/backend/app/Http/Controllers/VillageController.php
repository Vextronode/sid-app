<?php

namespace App\Http\Controllers;

use App\Models\Citizen;
use App\Models\Letter;
use Carbon\Carbon;
use Illuminate\Http\Request;

class VillageController extends Controller
{
    // ==========================================
    // GENDER STATS
    // ==========================================
    public function genderStats(Request $request)
    {
        $user = $request->user();

        $query = Citizen::query();

        // ==========================================
        // SCOPE BERDASARKAN USER LOGIN
        // ==========================================

        switch ($user->role) {

            // ==========================================
            // RT
            // Hanya warga RT yang login
            // ==========================================
            case 'rt':

                $official = $user->official;

                if (! $official || ! $official->rt_id) {
                    return response()->json([
                        'message' => 'Data official RT tidak ditemukan.',
                    ], 403);
                }

                $query->where('village_id', $user->village_id)
                    ->where('rt_id', $official->rt_id);

                break;

                // ==========================================
                // RW
                // Hanya warga RW yang login
                // ==========================================
            case 'rw':

                $official = $user->official;

                if (! $official || ! $official->rw_id) {
                    return response()->json([
                        'message' => 'Data official RW tidak ditemukan.',
                    ], 403);
                }

                $query->where('village_id', $user->village_id)
                    ->where('rw_id', $official->rw_id);

                break;

                // ==========================================
                // OPERATOR DESA
                // Kasi / Kaur / Petugas Desa
                // Semua warga dalam desa
                // ==========================================
            case 'kasi_pelayanan':
            case 'kaur_tu_umum':
            case 'petugas_desa':

                $query->where(
                    'village_id',
                    $user->village_id
                );

                break;

                // ==========================================
                // ROLE LAIN
                // ==========================================
            default:

                return response()->json([
                    'message' => 'Tidak memiliki akses.',
                ], 403);
        }

        // ==========================================
        // HITUNG GENDER
        // ==========================================

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

    // ==========================================
    // LETTER STATS
    // ==========================================
    public function letterStats(Request $request)
    {
        $user = $request->user();

        $date = Carbon::parse(
            $request->get('date', now()->toDateString())
        );

        $letterType = $request->get('letter_type');

        $baseQuery = Letter::query();

        // ==========================================
        // SCOPE DATA BERDASARKAN USER LOGIN
        // ==========================================

        switch ($user->role) {

            // ==========================================
            // RT
            // ==========================================
            case 'rt':

                $official = $user->official;

                if (! $official || ! $official->rt_id) {
                    return response()->json([
                        'message' => 'Data official RT tidak ditemukan.',
                    ], 403);
                }

                $baseQuery
                    ->where('village_id', $user->village_id)
                    ->whereHas('citizen', function ($query) use ($official) {
                        $query->where('rt_id', $official->rt_id);
                    });

                break;

                // ==========================================
                // RW
                // ==========================================
            case 'rw':

                $official = $user->official;

                if (! $official || ! $official->rw_id) {
                    return response()->json([
                        'message' => 'Data official RW tidak ditemukan.',
                    ], 403);
                }

                $baseQuery
                    ->where('village_id', $user->village_id)
                    ->whereHas('citizen', function ($query) use ($official) {
                        $query->where('rw_id', $official->rw_id);
                    });

                break;

                // ==========================================
                // OPERATOR DESA
                // ==========================================
            case 'kasi_pelayanan':
            case 'kaur_tu_umum':
            case 'petugas_desa':

                $baseQuery->where(
                    'village_id',
                    $user->village_id
                );

                break;

                // ==========================================
                // ROLE TIDAK DIIZINKAN
                // ==========================================
            default:

                return response()->json([
                    'message' => 'Tidak memiliki akses.',
                ], 403);
        }

        // ==========================================
        // FILTER JENIS SURAT
        // ==========================================

        if ($letterType && $letterType !== 'all') {

            $baseQuery->where(
                'letter_type_id',
                $letterType
            );
        }

        // ==========================================
        // DATA PER MINGGU
        // ==========================================

        $labels = [
            'Sen',
            'Sel',
            'Rab',
            'Kam',
            'Jum',
            'Sab',
            'Min',
        ];

        $values = [];

        $startOfWeek = $date
            ->copy()
            ->startOfWeek(Carbon::MONDAY);

        foreach ($labels as $i => $label) {

            $currentDate = $startOfWeek
                ->copy()
                ->addDays($i);

            $values[] = (clone $baseQuery)
                ->whereDate(
                    'submitted_at',
                    $currentDate
                )
                ->count();
        }

        // ==========================================
        // MAX Y
        // ==========================================

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
