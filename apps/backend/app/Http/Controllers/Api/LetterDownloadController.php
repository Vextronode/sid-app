<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\PdfService;
use App\Models\Letter;

class LetterDownloadController extends Controller
{
   public function __construct(
        protected PdfService $pdfService
    ) {}

    public function download(
        Request $request,
        Letter $letter
    ) {
        return $this->pdfService->download(
            $letter,
            $request->user()
        );
    }
}
