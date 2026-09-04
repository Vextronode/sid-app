<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\LetterCategory;
use App\Models\LetterType;
use Illuminate\Database\Seeder;

class ApprovalFlowSeeder extends Seeder
{
    public function run(): void
    {
        $categories = $this->seedCategories();

        $flow = $this->seedApprovalNormalFlow($categories['approval_normal']);

        $this->seedDirectFlow($categories['upload_mandiri']);
        $this->seedDirectFlow($categories['dokumen_pendukung']);
        $this->seedDirectFlow($categories['update_data']);

        $this->backfillLetterTypesWithoutFlow($categories['approval_normal'], $flow);
    }

    /**
     * @return array<string, LetterCategory>
     */
    private function seedCategories(): array
    {
        $definitions = [
            [
                'code' => 'approval_normal',
                'name' => 'Approval Normal',
                'description' => 'Melalui rangkaian approval bertingkat; jumlah & urutan tahap ditentukan approval_flows.',
                'handler_class' => 'App\\Services\\Letters\\ApprovalNormalHandler',
            ],
            [
                'code' => 'upload_mandiri',
                'name' => 'Upload Mandiri',
                'description' => 'TTD eksternal, tanpa approval berjenjang standar.',
                'handler_class' => 'App\\Services\\Letters\\UploadMandiriHandler',
            ],
            [
                'code' => 'dokumen_pendukung',
                'name' => 'Dokumen Pendukung',
                'description' => 'Bukan output surat final, sekadar syarat lampiran.',
                'handler_class' => 'App\\Services\\Letters\\DokumenPendukungHandler',
            ],
            [
                'code' => 'update_data',
                'name' => 'Update Data Kependudukan',
                'description' => 'Bukan proses terbit surat, murni update citizens/families.',
                'handler_class' => 'App\\Services\\Letters\\UpdateDataHandler',
            ],
        ];

        $categories = [];

        foreach ($definitions as $definition) {
            $categories[$definition['code']] = LetterCategory::query()->updateOrCreate(
                ['code' => $definition['code']],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'handler_class' => $definition['handler_class'],
                    'is_active' => true,
                ],
            );
        }

        return $categories;
    }

    private function seedApprovalNormalFlow(LetterCategory $category): ApprovalFlow
    {
        $flow = ApprovalFlow::query()->updateOrCreate(
            [
                'category_id' => $category->id,
                'name' => 'RT-Kades-Staff (3 Tahap)',
            ],
            [
                'description' => 'Flow default 3 tahap: RT -> Kepala Desa -> Staff (Kasi/Kaur). RW menerima notifikasi FYI non-blocking sebagai side-effect (bukan approver, tidak muncul di sini). Representasi step 2 (lihat EV5-1-S4_OPEN_QUESTION_SEKDES.md untuk status pertanyaan Sekdes yang masih terbuka).',
                'is_active' => true,
            ],
        );

        $steps = [
            ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
            ['step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => false],
            ['step_order' => 3, 'approver_position' => 'kasi_pelayanan', 'is_final' => true],
        ];

        foreach ($steps as $step) {
            FlowStep::query()->updateOrCreate(
                [
                    'flow_id' => $flow->id,
                    'step_order' => $step['step_order'],
                ],
                [
                    'approver_position' => $step['approver_position'],
                    'is_final' => $step['is_final'],
                ],
            );
        }

        return $flow;
    }

    private function seedDirectFlow(LetterCategory $category): void
    {
        // Wajib tetap punya row approval_flows meski flow_steps kosong,
        // demi konsistensi 1 pola query generik di seluruh sistem
        // (TDD §5.4.2, SID-ARCH-BE-001 S3.4).
        ApprovalFlow::query()->updateOrCreate(
            [
                'category_id' => $category->id,
                'name' => 'Direct - Tanpa Approval Bertingkat',
            ],
            [
                'description' => 'Kategori ini tidak melalui approval bertingkat standar.',
                'is_active' => true,
            ],
        );
    }

    /**
     * BARU — menggantikan backfillExistingLetterTypes() yang tadinya
     * ada di migration alter. category_id/flow_id di letter_types
     * sekarang NOT NULL sejak create table, jadi migration tidak lagi
     * butuh backfill sendiri — tapi kalau ada row letter_types yang
     * di-seed/di-import lewat jalur lain TANPA category_id/flow_id
     * (mis. seeder lama, fixture manual), method ini menyamakan mereka
     * ke kategori 'approval_normal' + flow default sebagai fallback
     * yang aman, konsisten dengan asumsi lama (10 template A01-A10).
     *
     * whereNull() supaya idempotent dan tidak menimpa letter_types yang
     * memang sudah eksplisit diberi category_id/flow_id lain.
     */
    private function backfillLetterTypesWithoutFlow(LetterCategory $category, ApprovalFlow $flow): void
    {
        LetterType::query()
            ->whereNull('category_id')
            ->orWhereNull('flow_id')
            ->update([
                'category_id' => $category->id,
                'flow_id' => $flow->id,
            ]);
    }
}
