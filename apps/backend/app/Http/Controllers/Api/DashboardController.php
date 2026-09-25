<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DashboardStatsRequest;
use App\Http\Resources\GenderStatsResource;
use App\Http\Resources\LetterStatsResource;
use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    public function index(Request $request)
    {
        return response()->json(
            $this->dashboardService->getDashboard($request->user())
        );
    }

    public function genderStats(DashboardStatsRequest $request)
    {
        return (new GenderStatsResource(
            $this->dashboardService->getGenderStats($request->user())
        ))->response();
    }

    public function letterStats(DashboardStatsRequest $request)
    {
        return (new LetterStatsResource(
            $this->dashboardService->getLetterStats(
                $request->user(),
                $request->validated('date'),
                $request->validated('letter_type'),
            )
        ))->response();
    }
}
