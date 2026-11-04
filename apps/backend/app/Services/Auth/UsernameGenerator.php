<?php

namespace App\Services\Auth;

use App\Repositories\UserRepository;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Username akun dari nama warga, selalu diakhiri 4 digit acak:
 * - satu kata: namadepan.4digit (mis. supratman.2518);
 * - dua kata atau lebih: namadepan.namapalingbelakang.4digit (mis.
 *   siti.aminah.4821, "Ahmad Fauzi Rahman" -> ahmad.rahman.7305).
 * Digit acak 1000-9999, juga bila tidak ada nama yang sama.
 *
 * Gelar depan (H., Dr., ...) dan gelar belakang setelah koma ("..., S.Pd")
 * diabaikan. Bila username sudah dipakai, 4 digit acak diulang, lalu 5
 * digit. Panjang maksimal 30 karakter (kolom users.username).
 */
class UsernameGenerator
{
    private const TITLES = [
        'h', 'hj', 'haji', 'hajjah', 'dr', 'drg', 'drh', 'drs', 'dra',
        'ir', 'prof', 'kh', 'ust', 'ustadz', 'ustadzah',
    ];

    /** Panjang tiap bagian nama untuk namadepan.namabelakang.digit (11 + 1 + 11 + 1 + 5 digit < 30). */
    private const PART_LENGTH = 11;

    /** Panjang nama depan untuk namadepan.digit (20 + 1 + 5 digit < 30). */
    private const SINGLE_LENGTH = 20;

    public function __construct(
        protected UserRepository $userRepository,
    ) {}

    public function generate(string $fullName): string
    {
        $words = $this->words($fullName);

        if (count($words) >= 2) {
            return $this->withDigits(
                substr($words[0], 0, self::PART_LENGTH).'.'.substr($words[count($words) - 1], 0, self::PART_LENGTH),
            );
        }

        return $this->withDigits(substr($words[0] ?? 'warga', 0, self::SINGLE_LENGTH));
    }

    /**
     * Kata nama yang sudah dinormalisasi (huruf kecil ASCII, tanpa tanda
     * baca), tanpa gelar depan dan gelar belakang.
     *
     * @return list<string>
     */
    private function words(string $fullName): array
    {
        // Gelar belakang ditulis setelah koma: "Budi Santoso, S.Pd".
        $name = Str::before(Str::lower(Str::ascii($fullName)), ',');

        $words = preg_split('/\s+/', trim(str_replace('.', ' ', $name)), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        while ($words !== [] && in_array($words[0], self::TITLES, true)) {
            array_shift($words);
        }

        $words = array_map(fn (string $word): string => preg_replace('/[^a-z0-9]/', '', $word) ?? '', $words);

        return array_values(array_filter($words, fn (string $word): bool => $word !== ''));
    }

    private function withDigits(string $base): string
    {
        foreach ([4, 5] as $digits) {
            for ($attempt = 0; $attempt < 10; $attempt++) {
                $username = $base.'.'.$this->randomNumber($digits);

                if (! $this->userRepository->usernameExists($username)) {
                    return $username;
                }
            }
        }

        throw new RuntimeException('Tidak dapat membuat username unik setelah beberapa percobaan.');
    }

    protected function randomNumber(int $digits): int
    {
        return random_int(10 ** ($digits - 1), (10 ** $digits) - 1);
    }
}
