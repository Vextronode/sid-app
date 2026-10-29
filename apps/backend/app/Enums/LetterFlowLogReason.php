<?php

namespace App\Enums;

enum LetterFlowLogReason: string
{
    case RtStageSkippedForOfficialApplicant = 'Tahap RT dilewati: pemohon adalah pejabat pada tahap tersebut';
    case RtStageSkippedForVillageHeadApplicant = 'Tahap RT dilewati: pemohon adalah Kepala Desa/Sekretaris Desa';
    case AwaitingSignatures = 'Menunggu tanda tangan pihak terkait';
    case HeldForVacantApprover = 'Surat ditahan: tahap RT belum memiliki pejabat aktif';
    case HeldForVacantFinalApprover = 'Surat ditahan: tahap Kepala Desa/Sekretaris Desa belum memiliki pejabat yang berwenang';
}
