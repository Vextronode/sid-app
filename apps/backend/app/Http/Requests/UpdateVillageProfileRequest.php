<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UpdateVillageProfileRequest extends FormRequest
{
    /**
     * UC-18. Aktor HANYA Petugas Desa (SID-ARCH-SYS-001 S2.3 - Kepala
     * Desa/Sekretaris Desa tidak punya akses ke domain CMS meski
     * keduanya approver aktif di domain surat).
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'staf_sid';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpException(403, 'Hanya '.UserRole::stafSidLabel().' yang dapat mengubah profil desa');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'head_name' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:20'],
            // Data kop surat dan wilayah administratif.
            'district' => ['nullable', 'string', 'max:100'],
            'regency' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'email' => ['nullable', 'email', 'max:150'],
            // Luas wilayah (hektare); kolomnya decimal(10, 3).
            'area_ha' => ['nullable', 'numeric', 'min:0', 'max:9999999.999'],
            'history' => ['nullable', 'string'],
            'vision' => ['nullable', 'string'],
            'mission' => ['nullable', 'string'],
            // Tampilan halaman publik (beranda dan kontak).
            'office_hours' => ['nullable', 'string', 'max:100'],
            // Sambutan Kepala Desa (opsional); kosong menyembunyikan blok di beranda.
            'welcome_message' => ['nullable', 'string', 'max:600'],
            // Titik kantor desa; keduanya diisi atau keduanya kosong.
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'hero_photo_credit' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama desa wajib diisi',
            'head_name.required' => 'Nama Kepala Desa wajib diisi',
            'area_ha.numeric' => 'Luas wilayah harus berupa angka',
            'area_ha.min' => 'Luas wilayah tidak boleh negatif',
            'area_ha.max' => 'Luas wilayah terlalu besar',
            'welcome_message.max' => 'Sambutan Kepala Desa paling banyak 600 karakter',
            'latitude.numeric' => 'Latitude harus berupa angka',
            'latitude.between' => 'Latitude harus di antara -90 dan 90',
            'latitude.required_with' => 'Latitude dan longitude harus diisi bersama',
            'longitude.numeric' => 'Longitude harus berupa angka',
            'longitude.between' => 'Longitude harus di antara -180 dan 180',
            'longitude.required_with' => 'Latitude dan longitude harus diisi bersama',
        ];
    }
}
