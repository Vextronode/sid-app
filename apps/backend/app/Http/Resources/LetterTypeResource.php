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
            'template' => $this->template,
            'requirements_info' => $this->requirement_info,
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
            'data_action' => $this->data_action,
            'form_fields' => $this->form_fields ?? [],
            'data_fields' => $this->data_fields ?? [],
            'signature_slots' => $this->signature_slots ?? [],
            'has_supporting_document' => $this->supporting_template !== null,
            'status_label' => $this->statusLabel(),
        ];
    }

    /**
     * Derived: template=NULL+is_active=false -> draft;
     * template!=NULL+is_active=true -> aktif;
     * template!=NULL+is_active=false -> dinonaktifkan
     * (schemas/letter-types/letter-types.yaml#/LetterType).
     */
    private function statusLabel(): string
    {
        if (! $this->template) {
            return 'draft';
        }

        return $this->is_active ? 'aktif' : 'dinonaktifkan';
    }
}
