<?php

namespace App\Support;

use App\Models\IntegrationClient;

/**
 * Jejak request client integrasi di activity log (`log_name: integration`,
 * causer = client). Hanya ID dan jumlah yang dicatat: NIK dan nilai token
 * tidak pernah masuk log.
 */
class IntegrationAudit
{
    public const LOG_NAME = 'integration';

    /**
     * @param  array<string, mixed>  $properties
     */
    public static function record(IntegrationClient $client, string $event, string $description, array $properties = []): void
    {
        activity(self::LOG_NAME)
            ->causedBy($client)
            ->event($event)
            ->withProperties([
                'village_id' => $client->village_id,
                'subject_label' => $client->name,
                'client' => $client->slug,
                ...$properties,
            ])
            ->log($description);
    }
}
