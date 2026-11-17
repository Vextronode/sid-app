<?php

namespace App\Console\Commands\Integration;

use Illuminate\Database\Eloquent\ModelNotFoundException;

class IntegrationRevokeCommand extends IntegrationCommand
{
    protected $signature = 'integration:revoke
        {slug : Kunci client, mis. cimart}
        {token_id : ID token dari integration:tokens}';

    protected $description = 'Mencabut satu token client integrasi.';

    public function handle(): int
    {
        $client = $this->client();

        if ($client === null) {
            return self::FAILURE;
        }

        try {
            $this->integrationClientService->revokeToken($client, (string) $this->argument('token_id'));
        } catch (ModelNotFoundException) {
            $this->error("Token tidak ditemukan pada client {$client->name}.");

            return self::FAILURE;
        }

        $this->info('Token dicabut. Request dengan token itu langsung ditolak.');

        return self::SUCCESS;
    }
}
