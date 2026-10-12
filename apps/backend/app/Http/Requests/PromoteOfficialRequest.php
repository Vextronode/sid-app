<?php

namespace App\Http\Requests;

use App\Enums\OfficialPosition;
use App\Rules\ValidOfficialPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PromoteOfficialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Jabatan yang punya akun ditetapkan ke akun warga; jabatan tanpa
        // akun ditetapkan langsung ke data warga.
        $position = $this->input('position');
        $needsAccount = ! is_string($position) || $position === '' || OfficialPosition::tryFrom($position) !== null;

        return [
            'user_id' => [Rule::requiredIf($needsAccount), 'nullable', 'exists:users,id'],
            'citizen_id' => [Rule::requiredIf(! $needsAccount), 'nullable', 'exists:citizens,id'],
            'position' => ['required', 'string', new ValidOfficialPosition($this->user()?->village_id)],
            'rt_id' => ['required_if:position,rt', 'nullable', 'exists:rts,id'],
            'rw_id' => ['required_if:position,rw', 'nullable', 'exists:rws,id'],
            'hamlet_id' => ['required_if:position,kadus', 'nullable', 'exists:hamlets,id'],
            'started_at' => ['required', 'date'],
            'term_ends_at' => ['nullable', 'date', 'after:started_at'],
            'phone_wa' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'photo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'Akun target wajib dipilih.',
            'user_id.exists' => 'Akun target tidak ditemukan.',
            'citizen_id.required' => 'Warga target wajib dipilih.',
            'citizen_id.exists' => 'Data warga target tidak ditemukan.',
            'position.required' => 'Posisi jabatan wajib dipilih.',
            'rt_id.required_if' => 'RT wajib dipilih untuk jabatan RT.',
            'rt_id.exists' => 'Data RT tidak ditemukan.',
            'rw_id.required_if' => 'RW wajib dipilih untuk jabatan RW.',
            'rw_id.exists' => 'Data RW tidak ditemukan.',
            'hamlet_id.required_if' => 'Dusun wajib dipilih untuk jabatan Kepala Dusun.',
            'hamlet_id.exists' => 'Data dusun tidak ditemukan.',
            'started_at.required' => 'Tanggal mulai wajib diisi.',
            'term_ends_at.after' => 'Akhir masa jabatan harus setelah tanggal mulai.',
            'phone_wa.max' => 'Nomor WhatsApp maksimal 20 karakter.',
            'photo.required' => 'Foto pejabat wajib diunggah.',
            'photo.image' => 'Foto pejabat harus berupa gambar.',
            'photo.mimes' => 'Foto pejabat harus berformat PNG, JPG, atau WEBP.',
            'photo.max' => 'Ukuran foto pejabat maksimal 5 MB.',
        ];
    }
}
