<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KasiApprovalRequest;
use App\Http\Resources\LetterResource;
use App\Models\Letter;
use App\Services\KasiApprovalService;
use Illuminate\Http\Request;

class KasiApprovalController extends Controller
{
    public function __construct(
        protected KasiApprovalService $service
    ) {}

    public function index(Request $request)
    {
        $letters = $this->service->getDashboardLetters(
            $request->user()
        );

        // Catatan refactor: response asli adalah array polos (tanpa
        // wrapper 'data'). JsonResource::collection(...)->response()
        // akan MEMBUNGKUS hasilnya dengan {data: [...]} secara default
        // (perilaku standar Laravel), sehingga tidak bisa dipakai
        // langsung tanpa mengubah kontrak endpoint ini. Dipakai toArray()
        // manual lalu response()->json() supaya bentuknya tetap array
        // polos persis seperti kode asli.
        return response()->json(
            LetterResource::collection($letters)->toArray($request)
        );
    }

    public function approve(
        KasiApprovalRequest $request,
        Letter $letter
    ) {
        $this->service->approve(
            $letter,
            $request->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Approval berhasil diproses.',
        ]);
    }

    public function show(Letter $letter)
    {
        $letter = $this->service->getLetterDetail($letter);

        return response()->json([
            'message' => 'Detail surat berhasil diambil',
            'data' => new LetterResource($letter),
        ]);
    }
}
