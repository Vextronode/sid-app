<?php

namespace Tests\Unit;

use App\Support\OccupationName;
use PHPUnit\Framework\TestCase;

class OccupationNameTest extends TestCase
{
    public function test_collapses_spaces_and_capitalises_each_word(): void
    {
        $this->assertSame('Buruh Harian Lepas', OccupationName::normalize('  buruh   harian lepas '));
        $this->assertSame('Ibu Rumah Tangga/Petani', OccupationName::normalize('ibu rumah tangga/petani'));
        $this->assertSame('Tukang Kayu-Batu', OccupationName::normalize('TUKANG kayu-batu'));
    }

    public function test_keeps_short_all_caps_acronyms(): void
    {
        $this->assertSame('Guru PNS', OccupationName::normalize('guru PNS'));
        $this->assertSame('Anggota POLRI', OccupationName::normalize('anggota POLRI'));
        $this->assertSame('Karyawan BUMN', OccupationName::normalize('karyawan BUMN'));
    }

    public function test_uses_the_catalog_spelling_when_it_matches(): void
    {
        $this->assertSame('Pelajar/Mahasiswa', OccupationName::normalize('pelajar/MAHASISWA', ['Petani', 'Pelajar/Mahasiswa']));
    }
}
