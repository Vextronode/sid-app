<?php

namespace App\Services;

use App\Casts\EncryptedCast;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\User;
use App\Support\AuditContext;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

/**
 * S-05. Jejak audit perubahan data kependudukan (warga, KK, dan
 * sosio-ekonomi KK). Dipanggil PopulationAuditObserver untuk setiap
 * penyimpanan lewat Eloquent, sehingga jalur tulis baru tercatat tanpa
 * pemanggilan manual. Keterangan tambahan (`source: import`, Terapkan
 * surat sebagai `letter_fulfilled`) diberikan pemanggil lewat AuditContext.
 *
 * Pelaku diambil dari user yang login; tanpa user (CLI, queue) dicatat
 * sebagai `actor: system` beserta `via`.
 *
 * Log name: `citizen` / `family`. Properties: `village_id` (scoping
 * halaman Log Aktivitas), `subject_label`, dan `changes` berbentuk
 * {field: {old, new}}. NIK, No KK, dan semua kolom bercast terenkripsi
 * tidak pernah dicatat dalam bentuk asli.
 */
class PopulationAuditService
{
    public const REDACTED = '(disamarkan)';

    /** Selalu disamarkan, apa pun cast-nya. */
    private const ALWAYS_SENSITIVE = ['nik', 'no_kk'];

    /** Kolom teknis yang tidak bermakna sebagai perubahan data. */
    private const IGNORED_FIELDS = [
        'id', 'village_id', 'nik_hash', 'no_kk_hash', 'created_at', 'updated_at',
        'surveyed_at', 'surveyed_by',
    ];

    public function created(Model $subject): void
    {
        $changes = [];

        foreach (array_keys($subject->getAttributes()) as $field) {
            $value = $this->value($subject, $field);

            if (! $this->ignored($subject, $field) && $value !== null) {
                $changes[$field] = ['old' => null, 'new' => $value];
            }
        }

        $this->record($subject, 'created', $changes);
    }

    /**
     * Dipanggil pada event `updated`: nilai lama dibaca dari original
     * model, yang belum disinkronkan pada saat itu.
     */
    public function updated(Model $subject): void
    {
        $before = (clone $subject)->setRawAttributes($subject->getRawOriginal());
        $changes = [];

        foreach (array_keys($subject->getChanges()) as $field) {
            if ($this->ignored($subject, $field)) {
                continue;
            }

            $old = $this->value($before, $field);
            $new = $this->value($subject, $field);

            if ($old !== $new || $this->isSensitive($subject, $field)) {
                $changes[$field] = ['old' => $old, 'new' => $new];
            }
        }

        if ($changes !== []) {
            $this->record($subject, 'updated', $changes);
        }
    }

    /**
     * Nilai terakhir disimpan sebagai `old` agar data dapat ditelusuri saat
     * sengketa.
     */
    public function deleted(Model $subject): void
    {
        $changes = [];

        foreach (array_keys($subject->getAttributes()) as $field) {
            $value = $this->value($subject, $field);

            if (! $this->ignored($subject, $field) && $value !== null) {
                $changes[$field] = ['old' => $value, 'new' => null];
            }
        }

        $this->record($subject, 'deleted', $changes);
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
     * Kolom yang nilainya disamarkan: NIK, No KK, dan setiap kolom bercast
     * `encrypted*` atau cast kustom terenkripsi (EncryptedCast). Mengikuti
     * cast model, sehingga kolom yang baru dienkripsi otomatis ikut.
     */
    public function isSensitive(Model $model, string $field): bool
    {
        if (in_array($field, self::ALWAYS_SENSITIVE, true)) {
            return true;
        }

        $cast = $model->getCasts()[$field] ?? null;

        if (! is_string($cast)) {
            return false;
        }

        // Parameter cast (`Kelas:arg`) dibuang, kecuali nama kelasnya sendiri
        // mengandung `:` (kelas anonim).
        $cast = class_exists($cast) ? $cast : explode(':', $cast, 2)[0];

        return str_starts_with($cast, 'encrypted')
            || (class_exists($cast) && is_subclass_of($cast, EncryptedCast::class));
    }

    /**
     * Menulis satu entri, atau menahannya bila sedang di dalam lingkup
     * AuditContext `aggregate` (lihat AuditContext::hold()).
     *
     * @param  array<string, mixed>  $entry
     */
    public function write(array $entry): void
    {
        if (app(AuditContext::class)->hold($entry)) {
            return;
        }

        activity($entry['log_name'])
            ->performedOn($entry['subject'])
            ->causedBy($entry['causer'])
            ->event($entry['event'])
            ->withProperties([...$entry['properties'], 'changes' => $entry['changes']])
            ->log($this->description($entry['log_name'], $entry['event']));
    }

    /**
     * @param  array<string, array{old: mixed, new: mixed}>  $changes
     */
    private function record(Model $subject, string $event, array $changes): void
    {
        [$logName, $subjectModel, $label] = $this->describe($subject);

        if ($subjectModel === null) {
            return;
        }

        $context = app(AuditContext::class)->context();
        $actor = auth()->user();
        $event = $context['event'] ?? ($subject instanceof FamilySocioeconomic ? 'socioeconomic_updated' : $event);
        $extra = Arr::except($context, ['event']);

        if ($event === 'created' && $actor !== null) {
            $extra['source'] ??= 'manual';
        }

        if ($actor === null) {
            $extra += ['actor' => 'system', 'via' => app()->runningInConsole() ? 'console' : 'http'];
        }

        $this->write([
            'key' => $logName.':'.$subjectModel->getKey(),
            'log_name' => $logName,
            'subject' => $subjectModel,
            'causer' => $actor,
            'event' => $event,
            'properties' => [
                'village_id' => $subjectModel->getAttribute('village_id') ?? $actor?->village_id,
                'subject_label' => $label,
                ...$extra,
            ],
            'changes' => $changes,
        ]);
    }

    /**
     * Data sosio-ekonomi tercatat sebagai riwayat KK-nya.
     *
     * @return array{0: string, 1: ?Model, 2: string}
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
            'letter_fulfilled' => 'Data kependudukan diubah berdasarkan surat',
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

        if ($this->isSensitive($model, $field)) {
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
