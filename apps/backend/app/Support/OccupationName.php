<?php

namespace App\Support;

/**
 * Merapikan nama pekerjaan yang diketik bebas (pilihan "Lainnya" di form
 * surat) agar penulisannya baku: spasi dirapatkan dan tiap kata diawali
 * huruf kapital. Singkatan yang diketik kapital semua (PNS, TNI, BUMN)
 * dibiarkan.
 */
class OccupationName
{
    private const ACRONYM_MAX_LENGTH = 5;

    /**
     * @param  array<int, string>  $catalog  nama di katalog desa; bila cocok
     *                                       (tanpa beda huruf besar/kecil), penulisan katalog dipakai
     */
    public static function normalize(string $value, array $catalog = []): string
    {
        $value = trim((string) preg_replace('/\s+/u', ' ', $value));

        foreach ($catalog as $name) {
            if (mb_strtolower($name) === mb_strtolower($value)) {
                return $name;
            }
        }

        // Kata dipecah juga di "-" dan "/" (mis. "Ibu Rumah Tangga/Petani").
        $parts = preg_split('/([ \-\/])/u', $value, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [];

        return implode('', array_map(self::word(...), $parts));
    }

    private static function word(string $word): string
    {
        $isAcronym = mb_strlen($word) <= self::ACRONYM_MAX_LENGTH
            && preg_match('/^\p{Lu}{2,}$/u', $word) === 1;

        return $isAcronym ? $word : mb_convert_case($word, MB_CASE_TITLE);
    }
}
