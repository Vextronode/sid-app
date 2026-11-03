<?php

namespace App\Casts;

use BackedEnum;

/**
 * Enum terenkripsi (pengganti cast enum), dipakai sebagai
 * `EncryptedEnum::class.':'.NamaEnum::class`.
 */
class EncryptedEnum extends EncryptedValue
{
    /**
     * @param  class-string<BackedEnum>  $enum
     */
    public function __construct(private readonly string $enum) {}

    protected function encode(mixed $value): string
    {
        return (string) ($value instanceof BackedEnum ? $value->value : $this->enum::from($value)->value);
    }

    protected function decode(string $value): BackedEnum
    {
        return $this->enum::from($value);
    }
}
