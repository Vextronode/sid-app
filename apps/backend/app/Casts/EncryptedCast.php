<?php

namespace App\Casts;

/**
 * Penanda cast kustom yang menyimpan nilainya terenkripsi (mis. tanggal,
 * boolean, atau enum terenkripsi). Kolom dengan cast seperti ini, sama
 * seperti cast `encrypted*` bawaan Laravel, otomatis disamarkan di jejak
 * audit (PopulationAuditService).
 */
interface EncryptedCast {}
