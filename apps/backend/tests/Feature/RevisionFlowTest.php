<?php

namespace Tests\Feature;

use App\Enums\LetterStatus;
use App\Http\Requests\KasiApprovalRequest;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class RevisionFlowTest extends TestCase
{
    public function test_kasi_approval_request_accepts_needs_revision_status(): void
    {
        $request = new KasiApprovalRequest;

        $validator = Validator::make(
            [
                'status' => 'needs_revision',
                'notes' => 'Mohon perbaiki data sesuai kebutuhan verifikasi.',
            ],
            $request->rules()
        );

        $this->assertFalse($validator->fails(), $validator->errors()->toJson());
    }

    public function test_waiting_revision_warga_status_is_defined_for_revision_flow(): void
    {
        $this->assertSame('waiting_revision_warga', LetterStatus::WaitingRevisionWarga->value);
        $this->assertSame('rw_approved', LetterStatus::RwApproved->value);
    }
}
