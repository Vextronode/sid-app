<?php

namespace App\Enums;

enum LetterFlowLogReason: string
{
    case RtStageSkippedForOfficialApplicant = 'Tahap RT dilewati: pemohon adalah pejabat pada tahap tersebut';
    case AwaitingSignatures = 'Menunggu tanda tangan pihak terkait';
    case HeldForVacantApprover = 'Surat ditahan: tahap RT belum memiliki pejabat aktif';
}
