<?php

namespace App\Http\Resources;

use App\Enums\LetterResultStage;
use App\Models\LetterAttachment;
use App\Support\LetterDocuments;
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
            'is_expired' => $this->resource->isExpired(),
            'submitted_at' => $this->submitted_at,
            'processed_at' => $this->processed_at,
            'signed_by_official_id' => $this->signed_by_official_id,
            'fulfilled_at' => $this->fulfilled_at,
            'fulfilled_by' => $this->fulfilled_by,
            // Surat approved dengan aksi data yang belum diterapkan Kasi/Kaur;
            // bila jenisnya mewajibkan unggah hasil, baru setelah hasil diterima.
            'needs_fulfillment' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType,
                fn () => $this->enumValue($this->status) === 'approved'
                    && $this->fulfilled_at === null
                    && ! in_array($this->enumValue($this->letterType->data_action), [null, 'none'], true)
                    && in_array($this->resource->resultStage(), [null, LetterResultStage::Accepted], true)
            ),
            // Tahap unggah hasil dari instansi luar (null bila tidak berlaku).
            'result_stage' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType,
                fn () => $this->resource->resultStage()?->value
            ),
            'result_upload_hint' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType,
                fn () => $this->letterType->result_upload_hint
            ),
            'results' => LetterResultResource::collection($this->whenLoaded('results')),
            'can_upload_result' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType && $request->user() !== null,
                fn () => $request->user()->can('uploadResult', $this->resource)
            ),
            'can_fulfill' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType && $request->user() !== null,
                fn () => $request->user()->can('fulfill', $this->resource)
            ),
            'can_review_result' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType && $request->user() !== null,
                fn () => $request->user()->can('reviewResult', $this->resource)
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'citizen' => new CitizenResource($this->whenLoaded('citizen')),
            'letter_type' => new LetterTypeResource($this->whenLoaded('letterType')),
            'approvals' => LetterApprovalResource::collection($this->whenLoaded('approvals')),
            'status_logs' => LetterStatusLogResource::collection($this->whenLoaded('statusLogs')),
            // Berkas hasil dari instansi tampil di `results`, bukan di lampiran.
            'attachments' => $this->when(
                $this->relationLoaded('attachments'),
                fn () => LetterAttachmentResource::collection(
                    $this->attachments->where('kind', '!=', LetterAttachment::KIND_RESULT)->values()
                )
            ),
            // Surat belum masuk ke approver karena masih ada slot tanda
            // tangan yang kosong (current_step_order 0).
            'awaiting_signatures' => $this->enumValue($this->status) === 'pending'
                && $this->current_step_order === 0,
            // Keadaan terkini tiap slot: baris terbaru per slot.
            'signatures' => $this->when(
                $this->relationLoaded('signatures'),
                fn () => LetterSignatureResource::collection(
                    $this->signatures->sortBy('id')->keyBy('slot_key')->values()
                )
            ),
            // Dokumen yang terbit untuk surat ini (utama + yang terbit bersama
            // sesuai jawaban form); diunduh/dipratinjau lewat ?document=key.
            'documents' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType,
                fn () => array_map(
                    fn (array $document): array => ['key' => $document['key'], 'title' => $document['title']],
                    LetterDocuments::applicable(
                        (string) ($this->snapshot['title'] ?? $this->letterType->name),
                        null,
                        $this->snapshot['documents'] ?? $this->letterType->documents,
                        is_array($this->payload) ? $this->payload : [],
                    ),
                )
            ),
            'has_supporting_document' => $this->when(
                $this->relationLoaded('letterType') && $this->letterType,
                fn () => $this->letterType->supporting_template !== null
            ),
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
