<?php

namespace App\Console\Commands\Integration;

use App\Enums\IntegrationAbility;
use InvalidArgumentException;

class IntegrationCreateCommand extends IntegrationCommand
{
    protected $signature = 'integration:create
        {slug : Kunci client, mis. cimart}
        {--name= : Nama aplikasi, mis. Cimart}
        {--abilities= : Daftar ability dipisah koma}
        {--village= : UUID desa, hanya perlu bila ada lebih dari satu desa}';

    protected $description = 'Membuat client integrasi pihak ketiga beserta token pertamanya.';

    public function handle(): int
    {
        $abilities = $this->abilitiesOption();

        if ($abilities === []) {
            $this->error('Isi --abilities. Pilihan: '.implode(', ', IntegrationAbility::values()).'.');

            return self::FAILURE;
        }

        try {
            $result = $this->integrationClientService->create(
                (string) $this->argument('slug'),
                (string) ($this->option('name') ?: $this->argument('slug')),
                $abilities,
                $this->option('village') ?: null,
            );
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $client = $result['client'];

        $this->info("Client integrasi {$client->name} ({$client->slug}) berhasil dibuat.");
        $this->line('Ability: '.implode(', ', $client->abilities));
        $this->printToken($result['token']);

        return self::SUCCESS;
    }
}
