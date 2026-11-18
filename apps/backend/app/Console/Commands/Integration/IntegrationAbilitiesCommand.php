<?php

namespace App\Console\Commands\Integration;

use InvalidArgumentException;

class IntegrationAbilitiesCommand extends IntegrationCommand
{
    protected $signature = 'integration:abilities
        {slug : Kunci client, mis. cimart}
        {--abilities= : Daftar ability baru dipisah koma (menggantikan yang lama)}';

    protected $description = 'Mengganti hak akses client integrasi beserta semua token-nya.';

    public function handle(): int
    {
        $client = $this->client();

        if ($client === null) {
            return self::FAILURE;
        }

        try {
            $client = $this->integrationClientService->updateAbilities($client, $this->abilitiesOption());
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Ability {$client->name}: ".implode(', ', $client->abilities));

        return self::SUCCESS;
    }
}
