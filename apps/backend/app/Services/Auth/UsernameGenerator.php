<?php

namespace App\Services\Auth;

use App\Repositories\UserRepository;
use Illuminate\Support\Str;
use RuntimeException;

class UsernameGenerator
{
    private const TITLES = [
        'h', 'hj', 'haji', 'hajjah', 'dr', 'drg', 'drh', 'drs', 'dra',
        'ir', 'prof', 'kh', 'ust', 'ustadz', 'ustadzah',
    ];

    public function __construct(
        protected UserRepository $userRepository,
    ) {}

    public function generate(string $fullName): string
    {
        $words = preg_split(
            '/\s+/',
            trim(str_replace([',', '.'], ' ', Str::lower(Str::ascii($fullName)))),
            -1,
            PREG_SPLIT_NO_EMPTY,
        ) ?: [];

        while ($words !== [] && in_array(preg_replace('/\./', '', $words[0]), self::TITLES, true)) {
            array_shift($words);
        }

        $firstWord = $words[0] ?? '';
        $base = substr(preg_replace('/[^a-z0-9]/', '', $firstWord) ?? '', 0, 20);
        $base = $base !== '' ? $base : 'warga';

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
