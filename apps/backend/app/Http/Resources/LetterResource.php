<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'village_id' => $this->village_id,
            'letter_type_id' => $this->letter_type_id,
            'submitted_by' => $this->submitted_by,
            'on_behalf_of' => $this->on_behalf_of,
            'citizen_id' => $this->citizen_id,
            'letter_number' => $this->letter_number,
            'applicant_name' => $this->applicant_name,
            // NIK tidak pernah dikirim plaintext (UU PDP, TDD-04, kontrak Letter).
            'applicant_nik_masked' => $this->mask($this->applicant_nik),
            'purpose' => $this->purpose,
            'payload' => $this->payload,
            'notes' => $this->notes,
            'status' => $this->status,
            'flow_id' => $this->flow_id,
            'current_step_order' => $this->current_step_order,
            'current_step' => $this->when(
                $this->relationLoaded('flow') && $this->flow?->relationLoaded('steps'),
                function () {
                    $step = $this->flow->steps->firstWhere('step_order', $this->current_step_order);

                    return $step ? [
                        'step_order' => $step->step_order,
                        'approver_position' => $step->approver_position,
                        'is_final' => $step->is_final,
                    ] : null;
                }
            ),
            'rejected_at_step' => $this->rejected_at_step,
            'is_overdue' => $this->is_overdue,
            'expires_at' => $this->expires_at,
            'submitted_at' => $this->submitted_at,
            'processed_at' => $this->processed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'letter_type' => new LetterTypeResource($this->whenLoaded('letterType')),
            'approvals' => LetterApprovalResource::collection($this->whenLoaded('approvals')),
            'status_logs' => LetterStatusLogResource::collection($this->whenLoaded('statusLogs')),
            // Indikator FYI RW: RW dinotifikasi begitu RT approve (RW bukan approver,
            // tidak punya row di letter_approvals).
            'rw_fyi_notified' => $this->when(
                $this->relationLoaded('approvals'),
                fn () => $this->approvals->contains(
                    fn ($a) => $this->enumValue($a->approval_level) === 'rt'
                        && $this->enumValue($a->action) === 'approved'
                )
            ),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }

    private function mask(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        return str_repeat('*', max(strlen($value) - 4, 0)).substr($value, -4);
    }

    private function enumValue(mixed $value): mixed
    {
        return $value instanceof \BackedEnum ? $value->value : $value;
    }
}
