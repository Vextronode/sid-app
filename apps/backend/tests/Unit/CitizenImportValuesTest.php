<?php

namespace Tests\Unit;

use App\Imports\Support\CitizenImportColumns;
use App\Imports\Support\CitizenImportValues;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Header alias dan normalisasi isi kolom impor warga (label Dukcapil, kode
 * SIAK/KPU, nilai sistem).
 */
class CitizenImportValuesTest extends TestCase
{
    /** @return iterable<string, array{string, string}> */
    public static function headers(): iterable
    {
        yield 'nama lengkap' => ['Nama Lengkap', 'name'];
        yield 'garis bawah' => ['tgl_lahir', 'date_of_birth'];
        yield 'titik' => ['Gol. Darah', 'blood_type'];
        yield 'no kk bertitik' => ['NO. KK', 'no_kk'];
        yield 'shdk panjang' => ['Status Hubungan Dalam Keluarga', 'family_role'];
        yield 'agama' => ['AGAMA', 'religion'];
        yield 'pendidikan dalam kk' => ['Pendidikan Dalam KK', 'last_education'];
        yield 'nama ibu' => ['NAMA IBU KANDUNG', 'mother_name_text'];
        yield 'dusun' => ['Dusun', 'hamlet'];
        yield 'rt rw gabungan' => ['RT/RW', 'rt_rw'];
        yield 'template sistem' => ['date_of_birth', 'date_of_birth'];
        yield 'keterangan baris kedua' => ["STS KAWIN\nB/S/P", 'marital_status'];
        yield 'sex' => ['SEX', 'gender'];
        yield 'ayah' => ['Ayah', 'father_name_text'];
        yield 'ibu' => ['IBU', 'mother_name_text'];
    }

    #[Test]
    #[DataProvider('headers')]
    public function it_maps_header_aliases(string $header, string $field): void
    {
        $this->assertSame(['A' => $field], CitizenImportColumns::map(['A' => $header]));
    }

    #[Test]
    public function kk_header_is_ignored_because_it_is_ambiguous(): void
    {
        $this->assertSame([], CitizenImportColumns::map(['A' => 'KK']));
    }

    /** @return iterable<string, array{string, list<string>, string|null}> */
    public static function suggestions(): iterable
    {
        yield 'kata tambahan' => ['Agama Warga', [], 'Agama'];
        yield 'alias terpanjang' => ['NAMA IBU KANDUNG ASLI', [], 'Nama Ibu'];
        yield 'keterangan format' => ['TGL LAHIR (dd-mm-yyyy)', [], 'Tanggal Lahir'];
        yield 'sudah terbaca' => ['Agama Warga', ['religion'], null];
        yield 'bukan kata utuh' => ['AGAMAWARGA', [], null];
        yield 'tidak ada alias' => ['KETERANGAN', [], null];
    }

    /** @param list<string> $mapped */
    #[Test]
    #[DataProvider('suggestions')]
    public function it_suggests_a_column_only_for_whole_alias_words(string $header, array $mapped, ?string $expected): void
    {
        $this->assertSame($expected, CitizenImportColumns::suggest($header, $mapped));
    }

    #[Test]
    public function missing_required_columns_are_listed(): void
    {
        $this->assertSame(
            ['Jenis Kelamin', 'RT dan RW'],
            CitizenImportColumns::missingRequired(['A' => 'nik', 'B' => 'name', 'C' => 'date_of_birth', 'D' => 'address', 'E' => 'rt']),
        );
        $this->assertSame(
            [],
            CitizenImportColumns::missingRequired(['A' => 'nik', 'B' => 'name', 'C' => 'date_of_birth', 'D' => 'gender', 'E' => 'address', 'F' => 'rt_rw']),
        );
    }

    #[Test]
    public function parent_columns_holding_a_nik_are_blanked_with_a_warning(): void
    {
        $warnings = [];
        $data = CitizenImportValues::normalize(
            ['father_name_text' => '3201012345670009', 'mother_name_text' => 'Iyah'],
            $warnings,
        );

        $this->assertNull($data['father_name_text']);
        $this->assertSame('Iyah', $data['mother_name_text']);
        $this->assertSame(['Nama ayah berisi angka seperti NIK, bukan nama; kolom ini dikosongkan.'], $warnings);
    }

    /** @return iterable<string, array{string, mixed, string|null}> */
    public static function values(): iterable
    {
        yield 'agama label' => ['religion', 'Protestan', 'kristen'];
        yield 'agama kode' => ['religion', '5', 'buddha'];
        yield 'agama nilai sistem' => ['religion', 'konghucu', 'konghucu'];
        yield 'pendidikan dukcapil' => ['last_education', 'SLTA/SEDERAJAT', 'sma'];
        yield 'pendidikan d3' => ['last_education', 'AKADEMI/DIPLOMA III/SARJANA MUDA', 'diploma'];
        yield 'pendidikan d4' => ['last_education', 'DIPLOMA IV/STRATA I', 's1'];
        yield 'belum tamat sd' => ['last_education', 'BELUM TAMAT SD/SEDERAJAT', 'tidak_sekolah'];
        yield 'pendidikan kode' => ['last_education', 9, 's2'];
        yield 'shdk label' => ['family_role', 'Kepala Keluarga', 'kepala_keluarga'];
        yield 'shdk kode' => ['family_role', '3', 'istri'];
        yield 'shdk nilai sistem' => ['family_role', 'famili_lain', 'famili_lain'];
        yield 'kawin kpu' => ['marital_status', 'S', 'kawin'];
        yield 'kawin pernah' => ['marital_status', 'P', null];
        yield 'kawin dukcapil' => ['marital_status', 'KAWIN BELUM TERCATAT', 'kawin_belum_tercatat'];
        yield 'kawin kode' => ['marital_status', 4, 'cerai_mati'];
        yield 'darah rhesus' => ['blood_type', 'AB+', 'AB'];
        yield 'darah rhesus kata' => ['blood_type', 'O Positif', 'O'];
        yield 'darah tidak tahu' => ['blood_type', 'Tidak Tahu', 'tidak_tahu'];
        yield 'darah kode' => ['blood_type', 13, 'tidak_tahu'];
        yield 'domisili' => ['domicile_status', 'PMI', 'tki'];
        yield 'jenis penduduk' => ['residency_type', 'Asli', 'lokal'];
        yield 'jenis kelamin kode' => ['gender', 2, 'P'];
        yield 'jenis kelamin label' => ['gender', 'Laki-Laki', 'L'];
        yield 'jenis kelamin inggris' => ['gender', 'F', 'P'];
        yield 'jenis kelamin male' => ['gender', 'Male', 'L'];
        yield 'strip berarti kosong' => ['religion', '-', null];
    }

    #[Test]
    #[DataProvider('values')]
    public function it_normalizes_choice_values(string $field, mixed $value, ?string $expected): void
    {
        $warnings = [];

        $this->assertSame($expected, CitizenImportValues::normalize([$field => $value], $warnings)[$field]);
        $this->assertSame([], $warnings);
    }

    #[Test]
    public function unknown_optional_values_are_blanked_with_a_warning(): void
    {
        $warnings = [];
        $data = CitizenImportValues::normalize(['religion' => 'KEPERCAYAAN', 'last_education' => '11'], $warnings);

        $this->assertNull($data['religion']);
        $this->assertNull($data['last_education']);
        $this->assertSame([
            'Agama "KEPERCAYAAN" tidak dikenali; kolom ini dikosongkan.',
            'Pendidikan "11" tidak dikenali; kolom ini dikosongkan.',
        ], $warnings);
    }

    #[Test]
    public function unknown_required_values_are_left_for_validation(): void
    {
        $this->assertSame('X', CitizenImportValues::normalize(['gender' => 'X'])['gender']);
    }

    #[Test]
    public function disability_text_marks_the_disorder_and_no_means_empty(): void
    {
        $this->assertSame(
            ['disability' => 'Tuna Daksa', 'has_disorder' => true],
            CitizenImportValues::normalize(['disability' => 'Tuna Daksa']),
        );
        $this->assertSame(['disability' => null], CitizenImportValues::normalize(['disability' => 'Tidak Ada']));
    }
}
