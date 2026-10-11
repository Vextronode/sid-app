<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Services\LetterAttachmentService;

class LetterAttachmentController extends Controller
{
    public function __construct(
        protected LetterAttachmentService $letterAttachmentService
    ) {}

    public function show(Letter $letter, LetterAttachment $attachment)
    {
        $this->authorize('view', $letter);

        return $this->letterAttachmentService->response($letter, $attachment);
    }
}
