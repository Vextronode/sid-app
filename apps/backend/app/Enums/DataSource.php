<?php

namespace App\Enums;

enum DataSource: string
{
    case MANUAL_INPUT_DESA = 'manual_input_desa';
    case IMPORT_EXCEL = 'import_excel';
    case DUKCAPIL_SYNC = 'dukcapil_sync';
}
