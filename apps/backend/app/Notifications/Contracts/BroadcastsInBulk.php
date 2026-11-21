<?php

namespace App\Notifications\Contracts;

/**
 * Penanda notifikasi yang dikirim massal (mis. peringatan bencana ke semua
 * akun desa). Listener BroadcastNewDatabaseNotification melewatinya; sinyal
 * realtime NotificationCreated dikirim pengirimnya sekali per kelompok
 * penerima, bukan satu job antrean per akun.
 */
interface BroadcastsInBulk {}
