<?php

namespace App\Enums;

/**
 * Aksi data yang dijalankan Kasi/Kaur setelah surat final approved.
 * Terpisah dari "menerbitkan surat": satu tipe surat boleh keduanya.
 */
enum LetterDataAction: string
{
    case None = 'none';
    case UpdateCitizen = 'update_citizen';
    case CreateCitizen = 'create_citizen';
    // Menonaktifkan anggota KK yang dipilih pemohon di isian family_members
    // (data_subject_field), mis. anggota yang pindah keluar.
    case DeactivateMembers = 'deactivate_members';
    // Perubahan dikerjakan Kasi/Kaur sendiri di Data Penduduk/KK (mis.
    // susunan KK baru); sistem hanya mencatat "Tandai selesai".
    case Manual = 'manual';
}
