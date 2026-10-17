<?php

namespace App\Services;

use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\User;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * S-05. Jejak audit perubahan data kependudukan yang dilakukan langsung
 * oleh Petugas Desa (tambah/ubah/hapus/impor warga, KK, dan data
 * sosio-ekonomi KK). Perubahan lewat surat dicatat terpisah oleh
 * LetterFulfillmentService (event `letter_fulfilled`).
 *
 * Log name: `citizen` / `family`. Properties: `village_id` (scoping
 * halaman Log Aktivitas), `subject_label`, dan `changes` berbentuk
 * {field: {old, new}}. NIK, No KK, dan alamat KK tidak pernah dicatat
 * dalam bentuk asli.
 */
class PopulationAuditService
{
    public const REDACTED = '(disamarkan)';

    private const SENSITIVE_FIELDS = ['nik', 'no_kk', 'family_address'];

    /** Kolom teknis yang tidak bermakna sebagai perubahan data. */
    private const IGNORED_FIELDS = [
        'id', 'village_id', 'nik_hash', 'no_kk_hash', 'created_at', 'updated_at',
        'surveyed_at', 'surveyed_by',
    ];

    /**
     * @param  array<string, mixed>  $extra
     */
    public function created(Model $subject, User $actor, array $extra = [], string $event = 'created'): void
    {
        $changes = [];

        foreach (array_keys($subject->getAttributes()) as $field) {
            $value = $this->value($subject, $field);

            if (! $this->ignored($subject, $field) && $value !== null) {
                $changes[$field] = ['old' => null, 'new' => $value];
            }
        }

        $this->write($subject, $actor, $event, $changes, $extra);
    }

    /**
     * $before adalah salinan model sebelum disimpan (`clone $model`).
     *
     * @param  array<string, mixed>  $extra
     */
    public function updated(Model $before, Model $after, User $actor, array $extra = [], string $event = 'updated'): void
    {
        $changes = [];

        foreach (array_keys($after->getChanges()) as $field) {
            if ($this->ignored($after, $field)) {
                continue;
            }

            $old = $this->value($before, $field);
            $new = $this->value($after, $field);

            if ($old !== $new || in_array($field, self::SENSITIVE_FIELDS, true)) {
                $changes[$field] = ['old' => $old, 'new' => $new];
            }
        }

        if ($changes !== []) {
            $this->write($after, $actor, $event, $changes, $extra);
        }
    }

    /**
     * Dipanggil sebelum record dihapus; nilai terakhir disimpan sebagai
     * `old` agar data dapat ditelusuri saat sengketa.
     */
    public function deleted(Model $subject, User $actor): void
    {
        $changes = [];

        foreach (array_keys($subject->getAttributes()) as $field) {
            $value = $this->value($subject, $field);

            if (! $this->ignored($subject, $field) && $value !== null) {
                $changes[$field] = ['old' => $value, 'new' => null];
            }
        }

        $this->write($subject, $actor, 'deleted', $changes);
    }

    /**
     * Ringkasan satu kali impor Excel; baris yang berhasil juga tercatat
     * sendiri-sendiri sebagai `created` dengan `source = import`.
     *
     * @param  array{total_rows: int, success_count: int, error_count: int}  $summary
     */
    public function citizensImported(User $actor, array $summary, string $fileName): void
    {
        activity('citizen')
            ->causedBy($actor)
            ->event('imported')
            ->withProperties([
                'village_id' => $actor->village_id,
                'subject_label' => $fileName,
                'summary' => [
                    'total_rows' => $summary['total_rows'],
                    'success_count' => $summary['success_count'],
                    'error_count' => $summary['error_count'],
                ],
                'changes' => [],
            ])
            ->log('Data warga diimpor dari Excel');
    }

    /**
     * @param  array<string, array{old: mixed, new: mixed}>  $changes
     * @param  array<string, mixed>  $extra
     */
    private function write(Model $subject, User $actor, string $event, array $changes, array $extra = []): void
    {
        [$logName, $subjectModel, $label] = $this->describe($subject);

        activity($logName)
            ->performedOn($subjectModel)
            ->causedBy($actor)
            ->event($event)
            ->withProperties([
                'village_id' => $subjectModel->getAttribute('village_id') ?? $actor->village_id,
                'subject_label' => $label,
                ...$extra,
                'changes' => $changes,
            ])
            ->log($this->description($logName, $event));
    }

    /**
     * Data sosio-ekonomi tercatat sebagai riwayat KK-nya.
     *
     * @return array{0: string, 1: Model, 2: string}
     */
    private function describe(Model $subject): array
    {
        if ($subject instanceof Citizen) {
            return ['citizen', $subject, (string) $subject->name];
        }

        $family = $subject instanceof Family ? $subject : $subject->getRelationValue('family');

        return ['family', $family, $this->maskNoKk($family?->no_kk)];
    }

    private function description(string $logName, string $event): string
    {
        $subject = $logName === 'citizen' ? 'Data warga' : 'Kartu Keluarga';

        return match ($event) {
            'created' => "{$subject} ditambahkan",
            'deleted' => "{$subject} dihapus",
            'socioeconomic_updated' => 'Data sosio-ekonomi KK diperbarui',
            default => "{$subject} diubah",
        };
    }

    private function ignored(Model $subject, string $field): bool
    {
        // family_id sosio-ekonomi selalu KK subjeknya sendiri.
        return in_array($field, self::IGNORED_FIELDS, true)
            || ($subject instanceof FamilySocioeconomic && $field === 'family_id');
    }

    private function value(Model $model, string $field): mixed
    {
        $value = $model->getAttribute($field);

        if ($value === null) {
            return null;
        }

        if (in_array($field, self::SENSITIVE_FIELDS, true)) {
            return self::REDACTED;
        }

        if ($value instanceof BackedEnum) {
            return $value->value;
        }

        if ($value instanceof DateTimeInterface) {
            return $model->hasCast($field, ['date', 'immutable_date'])
                ? $value->format('Y-m-d')
                : $value->format(DateTimeInterface::ATOM);
        }

        return $value;
    }

    private function maskNoKk(?string $noKk): string
    {
        if ($noKk === null || $noKk === '') {
            return 'KK';
        }

        return 'KK •••• '.substr($noKk, -4);
    }
}
