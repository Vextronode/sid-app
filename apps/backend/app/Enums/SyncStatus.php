<?php

namespace App\Enums;

enum SyncStatus: string
{
    case SYNCED = 'synced';
    case PENDING = 'pending';
    case CONFLICT = 'conflict';
}
