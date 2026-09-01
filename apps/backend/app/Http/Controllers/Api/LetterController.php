<?php

namespace App\Http\Controllers\Api;

use App\Enums\LetterStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\LetterIndexRequest;
use App\Http\Requests\StoreLetterRequest;
use App\Models\Letter;
use App\Services\LetterService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LetterController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {}

    public function store(StoreLetterRequest $request)
    {
        $letter = $this->letterService
            ->createLetter($request->validated());

        return response()->json([
            'message' => 'Permohonan berhasil dibuat.',
            'data' => $letter,
        ], 201);
    }

    public function index(LetterIndexRequest $request)
    {
        $letters = $this->letterService->getScopedLetters(
            auth()->user(),
            $request->validated()
        );

        return response()->json([
            'message' => 'Daftar surat berhasil diambil.',
            'data' => $letters,
        ]);
    }

    public function show($id)
    {
        $user = auth()->user();

        $letter = Letter::with([
            'letterType:id,name,code',
            'approvals.approvedBy:id,name',
        ])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Detail permohonan berhasil diambil.',
            'data' => $letter,
        ]);
    }

    public function resubmit(Request $request, Letter $letter)
    {
        $user = auth()->user();

        if ($letter->submitted_by !== $user->id) {
            abort(403, 'Anda tidak berwenang mengubah surat ini.');
        }

        if ($letter->status !== LetterStatus::WaitingRevisionWarga) {
            abort(422, 'Surat tidak dalam status revisi warga.');
        }

        if ($letter->revision_count >= 2) {
            abort(422, 'Batas revisi telah tercapai (maksimal 2x). Silakan ajukan surat baru.');
        }

        $data = $request->validate([
            'letter_type_id' => ['nullable', 'exists:letter_types,id'],
            'purpose' => ['required', 'string', 'max:500'],
            'payload' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($letter, $data) {
            $oldStatus = $letter->status->value;

            $letter->update([
                'letter_type_id' => $data['letter_type_id'] ?? $letter->letter_type_id,
                'purpose' => $data['purpose'],
                'payload' => $data['payload'] ?? $letter->payload,
                'notes' => $data['notes'] ?? $letter->notes,
                'status' => LetterStatus::RwApproved->value,
                'letter_number' => null,
                'expires_at' => null,
                'processed_at' => now(),
            ]);

            $letter->statusLogs()->create([
                'actor_id' => auth()->id(),
                'old_status' => $oldStatus,
                'new_status' => LetterStatus::RwApproved->value,
                'reason' => $data['notes'] ?? 'Warga mengirim ulang surat hasil revisi.',
            ]);
        });

        return response()->json([
            'message' => 'Surat berhasil dikirim ulang untuk verifikasi.',
            'data' => $letter->fresh(),
        ]);
    }

    public function destroy(Letter $letter)
    {
        $user = auth()->user();

        if ($letter->submitted_by !== $user->id && ! in_array($user->role, ['admin', 'operator', 'kasi_pelayanan', 'kaur_tu_umum', 'petugas_desa'])) {
            abort(403, 'Anda tidak berwenang menghapus surat ini.');
        }

        $letter->delete();

        return response()->json([
            'message' => 'Surat berhasil dihapus.',
        ]);
    }
}
