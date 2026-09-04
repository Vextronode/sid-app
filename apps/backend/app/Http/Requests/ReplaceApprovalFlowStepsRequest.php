<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReplaceApprovalFlowStepsRequest extends FormRequest
{
    private const VALID_POSITIONS = [
        'rt',
        'kepala_desa',
        'sekdes',
        'kasi_pelayanan',
        'kaur_tu_umum',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'petugas_desa';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'steps' => ['required', 'array', 'min:1'],
            'steps.*.step_order' => ['required', 'integer', 'min:1'],
            'steps.*.approver_position' => ['required', 'string', Rule::in(self::VALID_POSITIONS)],
            'steps.*.is_final' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'steps.*.approver_position.in' => 'RW dan Kadus tidak dapat menjadi approver_position sejak v5.0',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $steps = $this->input('steps', []);

            if (! is_array($steps) || empty($steps)) {
                return;
            }

            // step_order harus unik dalam satu flow.
            $orders = array_column($steps, 'step_order');
            if (count($orders) !== count(array_unique($orders))) {
                $validator->errors()->add('steps', 'step_order harus unik dalam satu flow');
            }

            // Minimal satu step harus is_final=true.
            $hasFinal = collect($steps)->contains(
                fn (array $step) => ($step['is_final'] ?? false) === true,
            );
            if (! $hasFinal) {
                $validator->errors()->add('steps', 'Minimal satu step harus is_final=true');
            }
        });
    }
}
