<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    public function genderStats(Request $request)
    {
        $stats = $this->dashboardService->getGenderStats($request->user());

        return response()->json($stats)->setStatusCode(200);
    }

    public function letterStats(Request $request)
    {
        $stats = $this->dashboardService->getLetterStats(
            $request->user(),
            $request->get('date'),
            $request->get('letter_type'),
        );

        return response()->json($stats)->setStatusCode(200);
    }
}
