<?php

namespace App\Exports;

use App\Enums\LetterStatus;
use App\Enums\OfficialPosition;
use App\Models\Letter;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * Laporan permohonan surat (Ekspor Laporan di halaman Permohonan Surat).
 * Barisnya sudah di-scope dan difilter oleh LetterService.
 */
class LettersExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping
{
    /**
     * @param  Collection<int, Letter>  $letters
     */
    public function __construct(private readonly Collection $letters) {}

    public function collection(): Collection
    {
        return $this->letters;
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return ['No. Surat', 'Jenis Surat', 'Pemohon', 'Tanggal Diajukan', 'Status', 'Tahap Saat Ini'];
    }

    /**
     * @param  Letter  $letter
     * @return list<string>
     */
    public function map($letter): array
    {
        $status = $letter->status instanceof LetterStatus
            ? $letter->status
            : LetterStatus::tryFrom((string) $letter->status);

        return [
            $letter->letter_number ?? '-',
            $letter->letterType?->name ?? '-',
            $letter->applicant_name ?? $letter->citizen?->name ?? '-',
            $letter->submitted_at?->timezone(config('app.timezone'))->format('d-m-Y H:i') ?? '-',
            $status?->label() ?? (string) $letter->status,
            $this->currentStepLabel($letter, $status),
        ];
    }

    private function currentStepLabel(Letter $letter, ?LetterStatus $status): string
    {
        if ($status === LetterStatus::Approved || $status === LetterStatus::Rejected) {
            return 'Selesai';
        }

        $position = $letter->flow?->steps
            ?->firstWhere('step_order', $letter->current_step_order)
            ?->approver_position;

        return $position
            ? (OfficialPosition::tryFrom($position)?->label() ?? $position)
            : '-';
    }
}
