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
            'steps.*.approver_position.in' => 'RW, Kadus, Kasi, dan Kaur tidak dapat menjadi approver pada alur persetujuan.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $steps = $this->input('steps', []);

            if (! is_array($steps) || empty($steps)) {
                return;
            }

            $orders = array_column($steps, 'step_order');
            if (count($orders) !== count(array_unique($orders))) {
                $validator->errors()->add('steps', 'step_order harus unik dalam satu flow');
            }

            $finalSteps = collect($steps)->filter(
                fn (array $step): bool => in_array($step['is_final'] ?? false, [true, 1, '1'], true),
            );

            if ($finalSteps->count() !== 1) {
                $validator->errors()->add('steps', 'Tepat satu step harus is_final=true');

                return;
            }

            $finalStep = $finalSteps->first();
            $highestOrder = max($orders);

            if ((int) $finalStep['step_order'] !== (int) $highestOrder) {
                $validator->errors()->add('steps', 'Step final harus memiliki step_order terbesar');
            }

            if (! in_array($finalStep['approver_position'], ['kepala_desa', 'sekdes'], true)) {
                $validator->errors()->add('steps', 'Approver step final harus Kepala Desa atau Sekdes');
            }
        });
    }
}
