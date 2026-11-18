<?php

namespace App\Console\Commands\Integration;

class IntegrationDisableCommand extends IntegrationCommand
{
    protected $signature = 'integration:disable {slug : Kunci client, mis. cimart}';

    protected $description = 'Menonaktifkan client integrasi tanpa mencabut token (request ditolak 403 integration_disabled).';

    public function handle(): int
    {
        $client = $this->client();

        if ($client === null) {
            return self::FAILURE;
        }

        $this->integrationClientService->setActive($client, false);
        $this->info("Client integrasi {$client->name} dinonaktifkan. Token tidak dicabut.");

        return self::SUCCESS;
    }
}
