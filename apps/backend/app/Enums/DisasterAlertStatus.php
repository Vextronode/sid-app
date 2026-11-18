<?php

namespace App\Enums;

/**
 * Keadaan peringatan SIGAP di SID, dikembalikan ke SIGAP sebagai `status`.
 * Urutan penentuan: diakhiri SIGAP, lalu diturunkan staf, lalu lewat masa
 * tayang; selain itu tampil.
 */
enum DisasterAlertStatus: string
{
    case Active = 'active';
    case Dismissed = 'dismissed';
    case Ended = 'ended';
    case Expired = 'expired';
}
