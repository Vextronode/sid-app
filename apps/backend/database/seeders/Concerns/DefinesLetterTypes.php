<?php

namespace Database\Seeders\Concerns;

use App\Models\LetterType;
use Illuminate\Support\Arr;

/**
 * Penyusun definisi isian form dan potongan template yang dipakai bersama
 * seeder Persuratan Desa (LetterTypeSeeder) dan Layanan Kependudukan
 * (ServiceLetterTypeSeeder).
 */
trait DefinesLetterTypes
{
    /**
     * Jenis surat baru dibuat lengkap. Jenis surat yang sudah ada hanya
     * diperbarui strukturnya; pengaturan desa (LetterType::
     * VILLAGE_SETTING_COLUMNS) dibiarkan, supaya menjalankan ulang seeder
     * (sid:sync-reference-data) tidak membatalkan perubahan Staf SIDUTama.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function upsertLetterType(string $villageId, string $code, array $attributes): void
    {
        $existing = LetterType::query()
            ->where('village_id', $villageId)
            ->where('code', $code)
            ->first();

        if ($existing === null) {
            LetterType::query()->create([...$attributes, 'village_id' => $villageId, 'code' => $code]);

            return;
        }

        $existing->update(Arr::except($attributes, LetterType::VILLAGE_SETTING_COLUMNS));
    }

    // ------------------------------------------------------------------
    // Isian form
    // ------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    private function field(string $name, string $label, string $type, bool $required, ?string $placeholder = null, array $extra = []): array
    {
        return ['name' => $name, 'label' => $label, 'type' => $type, 'required' => $required, 'placeholder' => $placeholder, ...$extra];
    }

    private function text(string $name, string $label, bool $required = true, ?string $placeholder = null): array
    {
        return $this->field($name, $label, 'text', $required, $placeholder);
    }

    private function textarea(string $name, string $label, bool $required = true, ?string $placeholder = null): array
    {
        return $this->field($name, $label, 'textarea', $required, $placeholder);
    }

    private function email(string $name, string $label, bool $required = true, ?string $placeholder = null): array
    {
        return $this->field($name, $label, 'email', $required, $placeholder);
    }

    /**
     * Nomor HP Indonesia (LetterFormSchema::PHONE_PATTERN).
     */
    private function phone(string $name, string $label, bool $required = true, ?string $placeholder = null): array
    {
        return $this->field($name, $label, 'phone', $required, $placeholder);
    }

    private function number(string $name, string $label, bool $required = true, ?string $placeholder = null): array
    {
        return $this->field($name, $label, 'number', $required, $placeholder);
    }

    /**
     * Unggahan gambar (JPG/PNG) sebagai bahan pertimbangan approver.
     */
    private function image(string $name, string $label, bool $required = true): array
    {
        return $this->field($name, $label, 'file', $required, null, ['accept' => 'image']);
    }

    /**
     * Pilihan dari katalog pekerjaan desa, plus "Lainnya" dengan teks bebas
     * yang hanya dicetak di surat (LetterFormSchema::resolveOccupations).
     */
    private function occupation(string $name, string $label, bool $required = true): array
    {
        return $this->field($name, $label, 'occupation', $required);
    }

    /**
     * Nilai awal isian dari kolom data penduduk pemohon (mis. occupation_id,
     * rt_id, name, address); pemohon tetap dapat mengubahnya.
     */
    private function prefilled(array $field, string $column): array
    {
        return [...$field, 'prefill_from_applicant' => $column];
    }

    /**
     * Dusun -> RW -> RT desa ini (dipilih dari data wilayah); dicetak lewat
     * {{ <nama>_dusun }}, {{ <nama>_rw }}, {{ <nama>_rt }}.
     */
    private function area(string $name, string $label, bool $required = true): array
    {
        return $this->field($name, $label, 'village_area', $required);
    }

    /**
     * Jam (input waktu 24 jam), disimpan "HH:MM".
     */
    private function time(string $name, string $label, bool $required = true): array
    {
        return $this->field($name, $label, 'time', $required);
    }

    /**
     * Tanggal peristiwa yang sudah terjadi (tidak sesudah hari ini), dengan
     * urutan terhadap tanggal lain (`date_order`) bila ada.
     *
     * @param  array<int, array<string, string>>  $order
     * @return array<string, mixed>
     */
    private function pastDate(string $name, string $label, bool $required = true, array $order = []): array
    {
        return [...$this->date($name, $label, $required), 'past' => true, ...($order === [] ? [] : ['date_order' => $order])];
    }

    private function date(string $name, string $label, bool $required = true): array
    {
        return $this->field($name, $label, 'date', $required);
    }

    /**
     * @param  array<string, string>  $options  nilai => label
     */
    private function select(string $name, string $label, array $options, bool $required = true): array
    {
        return $this->field($name, $label, 'select', $required, null, [
            'options' => array_map(
                fn (string $value, string $optionLabel): array => ['value' => $value, 'label' => $optionLabel],
                array_keys($options),
                $options,
            ),
        ]);
    }

    // ------------------------------------------------------------------
    // Template
    // ------------------------------------------------------------------

    private function paragraph(string $html, bool $indent = true): string
    {
        $textIndent = $indent ? '40px' : '0';

        return '<p style="text-align: justify; text-indent: '.$textIndent.'; margin: 12px 0; line-height: 1.5;">'.$html.'</p>';
    }

    /**
     * @param  array<string, string>  $rows  label => isi
     */
    private function rowsBlock(?string $intro, array $rows, int $indent = 30): string
    {
        $html = '<div style="margin-bottom: 12px;">';

        if ($intro !== null) {
            $html .= '<p style="margin: 0 0 8px 0;">'.$intro.'</p>';
        }

        $html .= '<table style="width: 100%; border-collapse: collapse; margin-left: '.$indent.'px;">';

        foreach ($rows as $label => $value) {
            $html .= '<tr>'
                .'<td style="width: 170px; vertical-align: top; padding: 2px 0;">'.$label.'</td>'
                .'<td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>'
                .'<td style="vertical-align: top; padding: 2px 0;">'.$value.'</td>'
                .'</tr>';
        }

        return $html.'</table></div>';
    }
}
