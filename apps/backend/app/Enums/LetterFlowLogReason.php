<?php

namespace App\Enums;

enum LetterFlowLogReason: string
{
    case RtStageSkippedForOfficialApplicant = 'Tahap RT dilewati: pemohon adalah pejabat pada tahap tersebut';
}
