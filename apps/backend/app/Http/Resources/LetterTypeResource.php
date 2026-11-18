<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LetterTypeResource extends JsonResource
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
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->category?->value,
            'category_label' => $this->category?->label(),
            'template' => $this->template,
            'requirements_info' => $this->requirement_info,
            // Layanan Kependudukan: {forms, attachments} yang dibawa ke Disdukcapil.
            'carry_documents' => $this->carry_documents,
            // Formulir isi tangan yang diunduh pemohon sebelum mengajukan
            // (GET /letter-types/{id}/forms/{key}); template tidak dikirim.
            'handwritten_forms' => self::handwrittenForms($this->handwritten_forms),
            'paper_size' => $this->paper_size,
            'flow_id' => $this->flow_id,
            'flow' => $this->when(
                $this->relationLoaded('flow') && $this->flow,
                fn () => [
                    'id' => $this->flow->id,
                    'name' => $this->flow->name,
                ]
            ),
            'assigned_role' => $this->assigned_role,
            'validity_days' => $this->validity_days,
            'is_active' => $this->is_active,
            'produces_letter' => $this->produces_letter,
            'issues_letter_number' => $this->issues_letter_number,
            'signed_by_village_head' => $this->signed_by_village_head,
            'data_action' => $this->data_action,
            'form_fields' => $this->form_fields ?? [],
            'data_fields' => $this->data_fields ?? [],
            'has_supporting_document' => $this->supporting_template !== null,
            'status_label' => $this->statusLabel(),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $forms
     * @return array<int, array{key: string, title: string, description: string|null}>
     */
    public static function handwrittenForms(?array $forms): array
    {
        return array_map(fn (array $form): array => [
            'key' => (string) $form['key'],
            'title' => (string) ($form['title'] ?? $form['key']),
            'description' => $form['description'] ?? null,
        ], $forms ?? []);
    }

    /**
     * Derived: template=NULL+is_active=false -> draft;
     * template!=NULL+is_active=true -> aktif;
     * template!=NULL+is_active=false -> dinonaktifkan
     * (schemas/letter-types/letter-types.yaml#/LetterType).
     */
    private function statusLabel(): string
    {
        // Layanan pendataan (mis. CPMI F11) tidak butuh template: bukan draft.
        if (! $this->resource->isReady()) {
            return 'draft';
        }

        return $this->is_active ? 'aktif' : 'dinonaktifkan';
    }
}
