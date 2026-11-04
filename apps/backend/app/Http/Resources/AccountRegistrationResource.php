<?php

namespace App\Http\Resources;

use App\Models\AccountRegistration;
use App\Models\User;
use App\Services\AccountActivationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Satu permintaan aktivasi akun untuk daftar petugas. Hak tindakan
 * (setujui/tolak, aktivasi manual) dihitung untuk petugas yang melihat.
 *
 * @property AccountRegistration $resource
 */
class AccountRegistrationResource extends JsonResource
{
    public function __construct(
        AccountRegistration $resource,
        private readonly User $viewer,
        private readonly AccountActivationService $activation,
    ) {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $registration = $this->resource;
        $pending = $registration->isPending();
        $nik = $registration->citizen?->nik;
        $banned = $this->activation->isBanned($registration->citizen_id);

        return [
            'id' => $registration->id,
            'status' => $registration->status,
            'method' => $registration->method,
            'citizen' => [
                'name' => $registration->citizen?->name,
                'nik_masked' => $nik ? str_repeat('*', 12).substr($nik, -4) : null,
            ],
            'username' => $registration->user?->username,
            'area' => [
                'rt' => $registration->rt?->number,
                'rw' => $registration->rw?->number,
                'hamlet' => $registration->hamlet?->name,
            ],
            // Menunggu: jenjang yang saat ini memegang; diputuskan: jenjang yang memutuskan.
            'level' => $pending ? $this->activation->route($registration)['level'] : $registration->decided_level,
            'can_decide' => $pending && $this->activation->canDecide($this->viewer, $registration),
            'can_manual_activate' => $banned
                && $registration->status === AccountRegistration::STATUS_REJECTED
                && $this->viewer->role === 'staf_sid'
                && ! AccountRegistration::query()
                    ->where('citizen_id', $registration->citizen_id)
                    ->where('id', '>', $registration->id)
                    ->exists(),
            // Foto hanya selama diproses atau setelah ditolak.
            'has_photo' => $registration->photo_path !== null,
            'rejection_count' => $this->activation->rejectionCount($registration->citizen_id),
            'banned' => $banned,
            'decided_by' => $registration->decider?->name,
            'decided_at' => $registration->decided_at,
            'decision_notes' => $registration->decision_notes,
            'created_at' => $registration->created_at,
        ];
    }
}
