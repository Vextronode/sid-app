<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\Village;
use Illuminate\Database\Seeder;

class ApprovalFlowSeeder extends Seeder
{
    public const DEFAULT_FLOW_NAME = 'RT-Kades/Sekdes (2 Tahap)';

    /**
     * Satu flow untuk semua tipe surat: RT -> Kepala Desa. Sekretaris Desa
     * menggantikan Kepala Desa pada step yang sama; RW dan Kadus hanya
     * menerima notifikasi setelah RT menyetujui.
     */
    public function run(): void
    {
        foreach (Village::query()->get() as $village) {
            $flow = ApprovalFlow::query()->updateOrCreate(
                [
                    'village_id' => $village->id,
                    'name' => self::DEFAULT_FLOW_NAME,
                ],
                [
                    'description' => 'Flow default 2 tahap: RT -> Kepala Desa. Sekretaris Desa saling menggantikan Kepala Desa bila berhalangan. RW menerima notifikasi FYI non-blocking sebagai side-effect, bukan approver.',
                    'is_active' => true,
                ],
            );

            $steps = [
                ['step_order' => 1, 'approver_position' => 'rt', 'is_final' => false],
                ['step_order' => 2, 'approver_position' => 'kepala_desa', 'is_final' => true],
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
        }
    }
}
