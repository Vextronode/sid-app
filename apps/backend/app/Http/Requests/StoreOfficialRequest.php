<?php

namespace App\Http\Requests;

use App\Rules\ValidOfficialPosition;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreOfficialRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'citizen_id' => [
                'required',
                'exists:citizens,id',
            ],

            'user_id' => [
                'nullable',
                'exists:users,id',
            ],

            'position' => [
                'required',
                'string',
                new ValidOfficialPosition($this->user()?->village_id),
            ],

            'village_id' => [
                'nullable',
                'exists:villages,id',
            ],

            'rt_id' => [
                'nullable',
                'exists:rts,id',
            ],

            'rw_id' => [
                'nullable',
                'exists:rws,id',
            ],

            'hamlet_id' => [
                'nullable',
                'exists:hamlets,id',
            ],

            'phone_wa' => [
                'nullable',
                'string',
                'max:20',
            ],

            'started_at' => [
                'required',
                'date',
            ],

            'term_ends_at' => [
                'nullable',
                'date',
                'after:started_at',
            ],

            'ended_at' => [
                'nullable',
                'date',
                'after_or_equal:started_at',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],

            'notes' => [
                'nullable',
                'string',
            ],

            'photo' => [
                'required',
                'image',
                'mimes:png,jpg,jpeg,webp',
                'max:5120',
            ],
        ];
    }
}
