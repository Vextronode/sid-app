<?php

namespace App\Console\Commands\Integration;

class IntegrationRotateCommand extends IntegrationCommand
{
    protected $signature = 'integration:rotate {slug : Kunci client, mis. cimart}';

    protected $description = 'Menerbitkan token baru tanpa mencabut token lama.';

    public function handle(): int
    {
        $client = $this->client();

        if ($client === null) {
            return self::FAILURE;
        }

        $token = $this->integrationClientService->issueToken($client);

        $this->info("Token baru untuk {$client->name} diterbitkan. Token lama tetap berlaku sampai dicabut (integration:revoke).");
        $this->printToken($token);

        return self::SUCCESS;
    }
}
