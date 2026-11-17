<?php

namespace App\Console\Commands\Integration;

class IntegrationEnableCommand extends IntegrationCommand
{
    protected $signature = 'integration:enable {slug : Kunci client, mis. cimart}';

    protected $description = 'Mengaktifkan kembali client integrasi.';

    public function handle(): int
    {
        $client = $this->client();

        if ($client === null) {
            return self::FAILURE;
        }

        $this->integrationClientService->setActive($client, true);
        $this->info("Client integrasi {$client->name} aktif.");

        return self::SUCCESS;
    }
}
