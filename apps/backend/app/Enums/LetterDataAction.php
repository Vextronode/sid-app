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
}
