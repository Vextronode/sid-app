<?php

namespace App\Exports\CitizenTemplate;

use App\Exports\CitizensTemplateExport;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Sheet petunjuk template impor warga: cara mengisi dan daftar kolom
 * (wajib/tidak, isian yang diterima, contoh). Tidak pernah dibaca impor
 * (tidak punya baris judul NIK + nama).
 */
final class CitizenTemplateGuideSheet extends DefaultValueBinder implements FromArray, WithColumnWidths, WithCustomValueBinder, WithEvents, WithTitle
{
    public function __construct(private readonly CitizenTemplateReference $reference) {}

    public function title(): string
    {
        return CitizensTemplateExport::GUIDE_SHEET;
    }

    /** @return list<string> */
    private function notes(): array
    {
        return [
            'Petunjuk Impor Data Warga',
            'Template dibuat '.$this->reference->generatedAt->format('d/m/Y H:i').'; daftar dusun, RW, RT, dan pekerjaan sesuai data sistem saat itu.',
            '',
            '1. Isi data di sheet "Data Warga", satu warga per baris. Jangan ubah judul kolom.',
            '2. Baris 2 (abu-abu) adalah contoh. Boleh dihapus atau dibiarkan: baris dengan NIK '.CitizensTemplateExport::EXAMPLE_NIK.' selalu dilewati saat impor.',
            '3. Kolom bertanda * wajib diisi. Kolom lain boleh dikosongkan.',
            '4. Kolom pilihan punya daftar (klik sel lalu panah di kanannya). Isi RW dulu; daftar RT hanya berisi RT di RW itu.',
            '5. Bila ada dusun, RW, RT, atau pekerjaan baru di sistem setelah template ini diunduh, unduh ulang template lalu salin baris yang sudah diisi. Isian baru tetap bisa diketik (pilih Yes saat Excel memberi peringatan); sistem mencocokkannya ke data terbaru saat impor.',
            '6. NIK, NO KK, RW, dan RT sudah berformat Teks. Bila menempel (paste) dari file lain, pilih "Paste Values" agar format dan daftar pilihan tetap.',
            '7. Saat impor, file diperiksa dulu. NIK yang sudah terdaftar bisa dipilih Timpa (ganti data lama dengan kolom yang terisi di file) atau Lewati.',
            '',
        ];
    }

    /** @return list<list<string>> */
    public function array(): array
    {
        $rows = array_map(fn (string $note) => [$note], $this->notes());
        $rows[] = ['Kolom', 'Wajib', 'Isian yang diterima', 'Contoh'];

        foreach (CitizensTemplateExport::COLUMNS as $column) {
            $choices = is_array($column['choices']) ? ' Pilihan: '.implode(', ', $column['choices']).'.' : '';

            $rows[] = [
                $column['header'],
                $column['required'] ? 'Ya' : '-',
                $column['accepts'].$choices,
                $column['format'] === 'date' && $column['example'] !== ''
                    ? date('d/m/Y', (int) strtotime($column['example']))
                    : $column['example'],
            ];
        }

        return $rows;
    }

    /** Semua isian sebagai teks: contoh NIK/No. KK tidak berubah jadi angka. */
    public function bindValue(Cell $cell, mixed $value): bool
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);

        return true;
    }

    /** @return array<string, int> */
    public function columnWidths(): array
    {
        return ['A' => 24, 'B' => 8, 'C' => 80, 'D' => 26];
    }

    /** @return array<class-string, callable> */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $tableHeader = count($this->notes()) + 1;
                $lastRow = $tableHeader + count(CitizensTemplateExport::COLUMNS);

                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle("A{$tableHeader}:D{$tableHeader}")->getFont()->setBold(true);
                $sheet->getStyle("A{$tableHeader}:D{$tableHeader}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8EEF7');
                $sheet->getStyle("A{$tableHeader}:D{$lastRow}")->getAlignment()
                    ->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);
            },
        ];
    }
}
