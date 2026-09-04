<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * EV5-1-S3 (KOREKSI). Sesuai Class Diagram Core v5 (entity FlowStep).
 *
 * ⚠️ approverPosition ENUM: rt | kepala_desa | sekdes | kasi_pelayanan |
 * kaur_tu_umum. 'rw' DAN 'kadus' TIDAK PERNAH muncul di ENUM ini — keduanya
 * TIDAK PERNAH menjadi gate approval formal (SID-ARCH-BE-001 S3.2). Ini
 * BUKAN pertanyaan terbuka — sudah jelas dan konsisten di TDD manapun.
 *
 * ⚠️ RALAT PENTING (dibanding versi sebelumnya): docblock versi lama di
 * sini mengklaim "KEPUTUSAN FINAL: Sekretaris Desa TIDAK ikut menjadi
 * approver" — klaim itu TIDAK PERNAH benar-benar dikonfirmasi pemilik
 * proyek. TDD v5.0, SID-ARCH-BE-001 S3.3, dan Backlog §7 poin 1 semuanya
 * konsisten menyatakan pertanyaan ini MASIH TERBUKA, secara eksplisit
 * ditandai "Blocking untuk EV5-4-S5" — bukan sesuatu yang boleh
 * "diselesaikan" di model skema hari ini. Lihat
 * EV5-1-S4_OPEN_QUESTION_SEKDES.md untuk detail.
 *
 * `resolvablePositions()` di bawah TETAP dipertahankan sebagai satu titik
 * tunggal abstraksi (ide desainnya bagus, terlepas dari isu di atas) —
 * tapi sekarang JUJUR soal batasannya: method ini hanya membaca nilai
 * approver_position APA ADANYA dari kolom (yang memang bernilai tunggal
 * per row di skema ini), BUKAN mengklaim sudah tahu jawaban pertanyaan
 * bisnis "siapa saja yang berwenang resolve step ini". Keputusan APAKAH
 * hasil resolve untuk step 'kepala_desa' juga perlu mencakup pejabat
 * 'sekdes' adalah tanggung jawab OfficialService (EV5-4-S1/S5), BUKAN
 * method ini — supaya saat jawabannya nanti keluar, perubahan cukup di
 * satu tempat (OfficialService), tanpa perlu menyentuh model ini lagi.
 *
 * UNIQUE(flowId, stepOrder) — dijamin di level migration (EV5-1-S3).
 */
class FlowStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'flow_id',
        'step_order',
        'approver_position',
        'is_final',
    ];

    protected $casts = [
        'step_order' => 'integer',
        'is_final' => 'boolean',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }

    /**
     * flow_step_id (BARU v5.0, nullable FK di letter_approvals) — referensi
     * step spesifik yang dieksekusi, untuk audit trail granular.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(LetterApproval::class, 'flow_step_id');
    }

    /**
     * Helper: apakah step ini bisa diresolve berbasis wilayah (RT) atau
     * murni berbasis posisi (Kepala Desa/Sekdes/Kasi/Kaur). Dipakai
     * OfficialService (EV5-4-S1) untuk menentukan pola resolve yang benar
     * — SID-ARCH-BE-001 S3.2 menegaskan dua pola ini HARUS dibedakan
     * eksplisit, tidak boleh disamakan.
     */
    public function isRegionBased(): bool
    {
        return $this->approver_position === 'rt';
    }

    /**
     * Titik tunggal abstraksi "posisi mana saja yang relevan untuk step
     * ini". Saat ini murni membaca approver_position kolom apa adanya
     * (satu nilai, karena skemanya memang single-value per row).
     *
     * ⚠️ TIDAK dipakai untuk menyimpulkan jawaban pertanyaan bisnis
     * Sekdes — lihat catatan class di atas. OfficialService (EV5-4-S1)
     * boleh menambahkan logic tambahan sendiri (misal: kalau
     * approver_position === 'kepala_desa' DAN keputusan Sekdes akhirnya
     * "ya ikut", resolve officials.position IN ('kepala_desa','sekdes'))
     * TANPA perlu mengubah method ini — method ini murni membaca skema,
     * bukan tempat aturan bisnis approver-ganda diputuskan.
     */
    public function resolvablePositions(): array
    {
        return [$this->approver_position];
    }
}
