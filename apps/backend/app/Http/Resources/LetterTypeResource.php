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
            'verification_type' => $this->verification_type,
            'requirements_info' => $this->requirement_info,
            'category_id' => $this->category_id,
            'category' => $this->when(
                $this->relationLoaded('category') && $this->category,
                fn () => [
                    'code' => $this->category->code,
                    'name' => $this->category->name,
                ]
            ),
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
