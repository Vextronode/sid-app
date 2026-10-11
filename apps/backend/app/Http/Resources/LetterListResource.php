<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Baris ringkas untuk daftar surat. Isian form, lampiran, tanda tangan,
 * riwayat status, dan data pribadi pemohon hanya tersedia di detail
 * (LetterResource lewat GET /letters/{id}).
 */
class LetterListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status instanceof \BackedEnum ? $this->status->value : $this->status;
        $step = $this->flow?->steps->firstWhere('step_order', $this->current_step_order);
        $dataAction = $this->letterType?->data_action;
        $dataAction = $dataAction instanceof \BackedEnum ? $dataAction->value : $dataAction;

        return [
            'id' => $this->id,
            'letter_type_id' => $this->letter_type_id,
            'submitted_by' => $this->submitted_by,
            'citizen_id' => $this->citizen_id,
            'letter_number' => $this->letter_number,
            'applicant_name' => $this->applicant_name,
            'notes' => $this->notes,
            'status' => $status,
            'current_step_order' => $this->current_step_order,
            'current_step' => $step ? [
                'step_order' => $step->step_order,
                'approver_position' => $step->approver_position,
                'is_final' => $step->is_final,
            ] : null,
            'rejected_at_step' => $this->rejected_at_step,
            'is_overdue' => (bool) $this->is_overdue,
            'awaiting_signatures' => $status === 'pending' && $this->current_step_order === 0,
            'needs_fulfillment' => $status === 'approved'
                && $this->fulfilled_at === null
                && ! in_array($dataAction, [null, 'none'], true),
            'submitted_at' => $this->submitted_at,
            'processed_at' => $this->processed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'letter_type' => $this->letterType ? [
                'id' => $this->letterType->id,
                'name' => $this->letterType->name,
                'code' => $this->letterType->code,
            ] : null,
            'citizen' => $this->citizen ? [
                'id' => $this->citizen->id,
                'name' => $this->citizen->name,
            ] : null,
        ];
    }
}
