<?php

namespace App\Console\Commands\Integration;

use App\Models\IntegrationClient;
use App\Services\IntegrationClientService;
use Illuminate\Console\Command;
use InvalidArgumentException;

/**
 * Dasar command `integration:*`. Logika ada di IntegrationClientService,
 * yang juga dipakai menu Integrasi Staf SIDUTama.
 */
abstract class IntegrationCommand extends Command
{
    public function __construct(protected IntegrationClientService $integrationClientService)
    {
        parent::__construct();
    }

    /** Client dari argumen {slug}, atau null setelah mencetak error. */
    protected function client(): ?IntegrationClient
    {
        try {
            return $this->integrationClientService->findBySlug((string) $this->argument('slug'));
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return null;
        }
    }

    /**
     * @return list<string>
     */
    protected function abilitiesOption(): array
    {
        return array_values(array_filter(array_map('trim', explode(',', (string) $this->option('abilities')))));
    }

    /** Token hanya dicetak sekali; SID hanya menyimpan hash-nya. */
    protected function printToken(string $token): void
    {
        $this->newLine();
        $this->line('Token (simpan sekarang, hanya ditampilkan sekali):');
        $this->line($token);
        $this->newLine();
        $this->warn('Serahkan token lewat jalur yang aman, jangan lewat grup chat.');
    }
}
