<?php

namespace App\Enums;

/**
 * Tahap setelah formulir pelayanan terbit, bagi jenis surat yang
 * mewajibkan unggah hasil dari instansi luar (letter_types.requires_result_upload).
 */
enum LetterResultStage: string
{
    // Belum ada unggahan, atau unggahan terakhir ditolak.
    case AwaitingUpload = 'awaiting_upload';
    // Unggahan terakhir menunggu verifikasi Kasi/Kaur.
    case UnderReview = 'under_review';
    // Unggahan terakhir diterima.
    case Accepted = 'accepted';
}
