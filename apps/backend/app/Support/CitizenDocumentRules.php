<?php

namespace App\Support;

/**
 * Dokumen & keterangan tambahan warga untuk Formulir Biodata Keluarga
 * (F-1.01): gelar, akta lahir/perkawinan/perceraian, dan kelainan fisik &
 * mental. Semua opsional; dipakai form Data Penduduk (tambah/ubah), impor
 * Excel, dan Terapkan layanan Fxx. Nomor akta dan keterangan penyandang
 * cacat disimpan terenkripsi (cast `encrypted` di Citizen).
 */
class CitizenDocumentRules
{
    /** Kolom yang disimpan terenkripsi (tidak dapat dicari/difilter). */
    public const ENCRYPTED = ['birth_certificate_number', 'marriage_certificate_number', 'divorce_certificate_number', 'disability'];

    /**
     * @return array<string, array<int, string>>
     */
    public static function rules(): array
    {
        return [
            'title_front' => ['nullable', 'string', 'max:30'],
            'title_back' => ['nullable', 'string', 'max:30'],
            'birth_certificate_number' => ['nullable', 'string', 'max:50'],
            'marriage_certificate_number' => ['nullable', 'string', 'max:50'],
            'marriage_date' => ['nullable', 'date'],
            'divorce_certificate_number' => ['nullable', 'string', 'max:50'],
            'divorce_date' => ['nullable', 'date'],
            'has_disorder' => ['nullable', 'boolean'],
            // Jenis cacat hanya bila ada kelainan fisik & mental.
            'disability' => ['nullable', 'required_if_accepted:has_disorder', 'string', 'max:100'],
        ];
    }
}
