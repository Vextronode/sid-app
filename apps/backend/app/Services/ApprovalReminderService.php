<?php

namespace App\Services;

use App\Models\ApprovalSetting;
use App\Models\LetterApproval;
use App\Notifications\LetterStatusNotification;
use App\Repositories\ApprovalSettingRepository;
use App\Repositories\LetterApprovalRepository;
use Illuminate\Support\Facades\DB;

/**
 * UC-22. Pengingat otomatis untuk approver: dikirim sekali per tahap per
 * surat ketika sisa waktu menuju `deadline_at` tinggal `reminder_hours`
 * (0 = tepat saat deadline). Nilai setting dibaca saat run, sehingga
 * perubahan oleh Staf SIDUTama ikut berlaku untuk surat yang sedang
 * menunggu. Dijalankan scheduler lewat `approvals:send-reminders`.
 */
class ApprovalReminderService
{
    public function __construct(
        private readonly LetterApprovalRepository $letterApprovalRepository,
        private readonly ApprovalSettingRepository $approvalSettingRepository,
        private readonly LetterFlowService $letterFlowService,
    ) {}

    /**
     * @return int jumlah approval yang pengingatnya dikirim
     */
    public function sendDueReminders(): int
    {
        /** @var array<string, ApprovalSetting|null> $settings */
        $settings = [];
        $sent = 0;

        foreach ($this->letterApprovalRepository->lazyPendingForReminder() as $approval) {
            $letter = $approval->letter;
            $level = $approval->approval_level->value;
            $key = "{$letter->village_id}|{$level}";

            if (! array_key_exists($key, $settings)) {
                $settings[$key] = $this->approvalSettingRepository->findByLevelAndVillage($level, $letter->village_id);
            }

            $setting = $settings[$key];

            if (! $setting?->is_active || ! $this->isDue($approval, $setting)) {
                continue;
            }

            if ($this->remind($approval)) {
                $sent++;
            }
        }

        return $sent;
    }

    private function isDue(LetterApproval $approval, ApprovalSetting $setting): bool
    {
        return now()->greaterThanOrEqualTo(
            $approval->deadline_at->copy()->subHours($setting->reminder_hours)
        );
    }

    /**
     * Tahap tanpa pejabat aktif tetap ditandai agar tidak dicoba ulang
     * setiap run; surat tertahan sudah diberitahukan ke Staf SIDUTama.
     */
    private function remind(LetterApproval $approval): bool
    {
        $letter = $approval->letter;
        $approvers = $this->letterFlowService->eligibleApprovers($approval->flowStep, $letter);

        return DB::transaction(function () use ($approval, $letter, $approvers): bool {
            if (! $this->letterApprovalRepository->markReminded($approval)) {
                return false;
            }

            $message = $approval->deadline_at->isPast()
                ? 'Batas waktu persetujuan surat ini sudah lewat. Mohon segera diproses.'
                : 'Surat menunggu persetujuan Anda. Batas waktu berakhir '
                    .$approval->deadline_at->timezone(config('app.timezone'))->translatedFormat('j F Y H:i').'.';

            foreach ($approvers as $official) {
                $official->user?->notify(new LetterStatusNotification(
                    $letter,
                    'Pengingat Persetujuan Surat',
                    $message,
                    'approval_reminder',
                ));
            }

            return $approvers->contains(fn ($official) => $official->user !== null);
        });
    }
}
