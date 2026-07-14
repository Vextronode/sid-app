<?php

namespace App\Enums;

enum ApprovalLevel: string
{
    case RT = 'rt';
    case RW = 'rw';
    case KADUS = 'kadus';
    case KASI = 'kasi';
}