<?php

namespace App\Imports\Support;

use App\Models\Citizen;
use App\Models\Hamlet;
use App\Models\Rt;
use App\Support\CitizenLabels;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Support\Carbon;

/**
 * Perbandingan data warga yang sudah ada dengan baris file impor yang NIK-nya
 * sama (preview "Timpa / Lewati"). Hanya kolom yang ada dan terisi di file yang
 * dibandingkan, sama dengan kolom yang nanti ditimpa; NIK tidak pernah diubah.
 */
final class CitizenImportChanges
{
    /** rt_id/hamlet_id di sini hasil resolusi RT/RW & dusun, bukan kolom ID. */
    private const LABELS = [
        'rt_id' => 'RT/RW',
        'hamlet_id' => 'Dusun',
    ];

    private const VALUE_LABELS = [
        'gender' => ['L' => 'Laki-Laki', 'P' => 'Perempuan'],
        'marital_status' => CitizenLabels::MARITAL_STATUS,
        'religion' => CitizenLabels::RELIGION,
        'last_education' => CitizenLabels::LAST_EDUCATION,
    ];

    /** @var array<int, string> */
    private array $rtLabels = [];

    /** @var array<int, string> */
    private array $hamletNames = [];

    /**
     * Data yang akan ditimpa: kolom terisi selain NIK dan KK.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function overwriteData(array $validated): array
    {
        unset($validated['nik'], $validated['family_id']);

        return array_filter($validated, fn ($value) => $value !== null && $value !== '');
    }

    /**
     * @param  array<string, mixed>  $data  hasil overwriteData()
     * @return list<array{field: string, label: string, before: string, after: string}>
     */
    public function between(Citizen $citizen, array $data, ?string $noKk): array
    {
        $changes = [];

        foreach ($data as $field => $after) {
            $before = $citizen->getAttribute($field);

            if (self::comparable($field, $before) === self::comparable($field, $after)) {
                continue;
            }

            $changes[] = [
                'field' => $field,
                'label' => self::LABELS[$field] ?? CitizenImportColumns::label($field),
                'before' => $this->display($field, $before),
                'after' => $this->display($field, $after),
            ];
        }

        if ($noKk !== null && $citizen->family?->no_kk !== $noKk) {
            $changes[] = [
                'field' => 'no_kk',
                'label' => CitizenImportColumns::label('no_kk'),
                'before' => self::maskNoKk($citizen->family?->no_kk),
                'after' => self::maskNoKk($noKk),
            ];
        }

        return $changes;
    }

    private static function comparable(string $field, mixed $value): string
    {
        $value = $value instanceof BackedEnum ? $value->value : $value;

        return match (true) {
            $value === null => '',
            $value instanceof DateTimeInterface => $value->format('Y-m-d'),
            $field === 'date_of_birth' => Carbon::parse((string) $value)->format('Y-m-d'),
            is_bool($value) => $value ? '1' : '0',
            default => trim((string) $value),
        };
    }

    private function display(string $field, mixed $value): string
    {
        $value = $value instanceof BackedEnum ? $value->value : $value;

        if ($value === null || $value === '') {
            return '-';
        }

        return match (true) {
            $value instanceof DateTimeInterface => $value->format('d/m/Y'),
            $field === 'date_of_birth' => Carbon::parse((string) $value)->format('d/m/Y'),
            is_bool($value) => $value ? 'Ya' : 'Tidak',
            $field === 'rt_id' => $this->rtLabel((int) $value),
            $field === 'hamlet_id' => $this->hamletName((int) $value),
            isset(self::VALUE_LABELS[$field]) => self::VALUE_LABELS[$field][(string) $value] ?? (string) $value,
            default => (string) $value,
        };
    }

    private function rtLabel(int $id): string
    {
        return $this->rtLabels[$id] ??= ($rt = Rt::query()->with('rw')->find($id))
            ? 'RT '.$rt->number.' / RW '.($rt->rw?->number ?? '-')
            : '-';
    }

    private function hamletName(int $id): string
    {
        return $this->hamletNames[$id] ??= Hamlet::query()->whereKey($id)->value('name') ?? '-';
    }

    private static function maskNoKk(?string $noKk): string
    {
        return $noKk ? str_repeat('*', 12).substr($noKk, -4) : '-';
    }
}
