<?php

namespace Tests\Unit;

use App\Enums\OfficialPosition;
use App\Enums\UserRole;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OfficialPositionEnumTest extends TestCase
{
    #[Test]
    public function account_positions_map_to_their_user_roles(): void
    {
        $expected = [
            OfficialPosition::KepalaDesa->value => UserRole::KepalaDesa,
            OfficialPosition::Rt->value => UserRole::Rt,
            OfficialPosition::Rw->value => UserRole::Rw,
            OfficialPosition::Kadus->value => UserRole::Kadus,
            OfficialPosition::KasiPemerintahan->value => UserRole::KasiPemerintahan,
            OfficialPosition::KaurTuUmum->value => UserRole::KaurTuUmum,
            OfficialPosition::StafSid->value => UserRole::StafSid,
            OfficialPosition::SekretarisDesa->value => UserRole::SekretarisDesa,
        ];

        foreach ($expected as $position => $role) {
            $this->assertSame($role, OfficialPosition::from($position)->userRole());
        }

        foreach (array_diff(
            array_column(OfficialPosition::cases(), 'value'),
            array_keys($expected),
        ) as $position) {
            $this->assertNull(OfficialPosition::from($position)->userRole());
        }
    }

    #[Test]
    public function account_positions_contains_only_positions_with_accounts(): void
    {
        $this->assertSame([
            'kepala_desa',
            'rt',
            'rw',
            'kadus',
            'kasi_pemerintahan',
            'kaur_tu_umum',
            'staf_sid',
            'sekretaris_desa',
        ], OfficialPosition::accountPositions());
    }

    #[Test]
    public function positions_resolve_their_scope_column(): void
    {
        $this->assertSame('rt_id', OfficialPosition::Rt->scopeColumn());
        $this->assertSame('rw_id', OfficialPosition::Rw->scopeColumn());
        $this->assertSame('hamlet_id', OfficialPosition::Kadus->scopeColumn());
        $this->assertNull(OfficialPosition::KepalaDesa->scopeColumn());
        $this->assertNull(OfficialPosition::KasiPemerintahan->scopeColumn());
    }

    #[Test]
    public function every_account_position_has_a_single_holder_per_scope(): void
    {
        // Termasuk staf aplikasi desa: hanya satu, penggantinya lewat rotasi.
        foreach (OfficialPosition::cases() as $position) {
            $this->assertTrue($position->isSingleHolderPerScope(), $position->value);
        }
    }

    #[Test]
    public function staf_sid_label_follows_the_configured_app_name(): void
    {
        $this->assertSame('Staf SIDUTama', OfficialPosition::StafSid->label());
    }
}
