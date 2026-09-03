<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Services\PdfService;
use Illuminate\Http\Request;

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
            $request->user(),
            $request->query('template', 'wet')
        );
    }
}
