<?php

namespace App\Models;

use App\Enums\LetterDataAction;
use App\Enums\LetterTypeCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LetterType extends Model
{
    use HasFactory;

    /**
     * Kolom milik desa: diubah Staf SIDUTama lewat menu Alur & Jenis Surat
     * (UpdateLetterTypeRequest; petugas mengikuti kategori). Seeder hanya
     * mengisinya saat jenis surat dibuat dan tidak menimpanya pada baris yang
     * sudah ada; struktur lain (template, isian, flow, aksi data) milik
     * developer dan selalu diperbarui dari definisi seeder.
     */
    public const VILLAGE_SETTING_COLUMNS = ['category', 'assigned_role', 'validity_days', 'is_active'];

    protected $fillable = [
        'village_id',
        'code',
        'name',
        'description',
        'category',
        'template',
        'documents',
        'paper_size',
        'handwritten_forms',
        'requirement_info',
        'flow_id',
        'assigned_role',
        'validity_days',
        'is_active',
        'classification_code',
        'produces_letter',
        'data_action',
        'form_fields',
        'data_fields',
        'data_subject_field',
        'supporting_template',
        'issues_letter_number',
        'signed_by_village_head',
        'requires_result_upload',
        'result_upload_hint',
        'carry_documents',
        'data_instructions',
        'data_options',
    ];

    protected $attributes = [
        'category' => 'persuratan',
        'issues_letter_number' => true,
        'signed_by_village_head' => true,
        'requires_result_upload' => false,
        'paper_size' => 'a4',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'category' => LetterTypeCategory::class,
        'produces_letter' => 'boolean',
        'issues_letter_number' => 'boolean',
        'signed_by_village_head' => 'boolean',
        'requires_result_upload' => 'boolean',
        'data_action' => LetterDataAction::class,
        'form_fields' => 'array',
        'data_fields' => 'array',
        'carry_documents' => 'array',
        'data_options' => 'array',
        'documents' => 'array',
        'handwritten_forms' => 'array',
    ];

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ApprovalFlow::class, 'flow_id');
    }

    /**
     * Isinya lengkap sehingga boleh diaktifkan dan diajukan: punya template,
     * atau memang tidak menerbitkan surat (layanan pendataan, mis. CPMI F11,
     * yang hasilnya data). Tanpa keduanya = draft.
     */
    public function isReady(): bool
    {
        return $this->template !== null || $this->produces_letter === false;
    }

    /** Jenis surat aktif yang bisa diajukan (lihat isReady()). */
    public function scopeSubmittable(Builder $query): Builder
    {
        return $query
            ->where('is_active', true)
            ->where(fn (Builder $ready) => $ready
                ->whereNotNull('template')
                ->orWhere('produces_letter', false));
    }
}
