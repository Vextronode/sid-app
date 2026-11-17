<?php

namespace App\Console\Commands\Integration;

use App\Models\PersonalAccessToken;

class IntegrationTokensCommand extends IntegrationCommand
{
    protected $signature = 'integration:tokens {slug : Kunci client, mis. cimart}';

    protected $description = 'Menampilkan token client integrasi (tanpa nilai token).';

    public function handle(): int
    {
        $client = $this->client();

        if ($client === null) {
            return self::FAILURE;
        }

        $tokens = $this->integrationClientService->tokens($client);

        $this->line($client->name.' ('.($client->is_active ? 'aktif' : 'nonaktif').')');

        if ($tokens->isEmpty()) {
            $this->warn('Belum ada token. Terbitkan dengan integration:rotate.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Nama', 'Dibuat', 'Terakhir dipakai'],
            $tokens->map(fn (PersonalAccessToken $token) => [
                $token->id,
                $token->name,
                $token->created_at?->format('Y-m-d H:i'),
                $token->last_used_at?->format('Y-m-d H:i') ?? 'Belum pernah',
            ])->all(),
        );

        return self::SUCCESS;
    }
}
