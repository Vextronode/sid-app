<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class UserRoleEnumTest extends TestCase
{
    #[Test]
    public function it_has_exactly_nine_cases_matching_tdd_role_enum(): void
    {
        $this->assertCount(9, UserRole::cases());
    }

    #[Test]
    public function values_match_the_database_enum_exactly(): void
    {
        $expected = [
            'warga', 'rt', 'rw', 'kadus', 'kasi_pelayanan',
            'kaur_tu_umum', 'petugas_desa', 'kepala_desa', 'sekretaris_desa',
        ];

        $this->assertEqualsCanonicalizing($expected, UserRole::values());
    }

    #[Test]
    public function every_case_has_a_non_empty_label(): void
    {
        foreach (UserRole::cases() as $case) {
            $this->assertNotEmpty($case->label());
        }
    }

    #[Test]
    public function middleware_helper_builds_single_role_string(): void
    {
        $this->assertSame('role:rt', UserRole::middleware(UserRole::Rt));
    }

    #[Test]
    public function middleware_helper_builds_comma_separated_multi_role_string(): void
    {
        $this->assertSame(
            'role:kepala_desa,sekretaris_desa',
            UserRole::middleware(UserRole::KepalaDesa, UserRole::SekretarisDesa)
        );
    }

    #[Test]
    public function it_can_be_constructed_from_string_value(): void
    {
        $this->assertSame(UserRole::PetugasDesa, UserRole::from('petugas_desa'));
    }

    #[Test]
    public function constructing_from_invalid_value_throws(): void
    {
        $this->expectException(\ValueError::class);
        UserRole::from('super_admin');
    }
}
