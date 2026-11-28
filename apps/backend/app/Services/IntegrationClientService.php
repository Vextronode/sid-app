<?php

namespace App\Services;

use App\Enums\IntegrationAbility;
use App\Models\IntegrationClient;
use App\Models\PersonalAccessToken;
use App\Models\User;
use App\Models\Village;
use App\Support\IntegrationAudit;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Satu sumber logika pengelolaan client integrasi, dipakai command artisan
 * `integration:*` dan menu Integrasi Staf SIDUTama. Nilai token hanya
 * dikembalikan sekali saat diterbitkan; yang tersimpan hanya hash-nya.
 * Setiap perubahan dicatat di activity log `integration` tanpa nilai token.
 */
class IntegrationClientService
{
    public const SLUG_PATTERN = '/^[a-z0-9][a-z0-9-]{1,49}$/';

    /**
     * @return Collection<int, IntegrationClient>
     */
    public function listForVillage(string $villageId): Collection
    {
        return IntegrationClient::query()
            ->where('village_id', $villageId)
            ->with(['tokens' => fn ($query) => $query->orderByDesc('created_at')])
            ->orderBy('name')
            ->get();
    }

    public function findBySlug(string $slug): IntegrationClient
    {
        $client = IntegrationClient::query()->where('slug', $slug)->first();

        if ($client === null) {
            throw new InvalidArgumentException("Client integrasi \"{$slug}\" tidak ditemukan.");
        }

        return $client;
    }

    /**
     * Membuat client sekaligus token pertamanya.
     *
     * @param  list<string>  $abilities
     * @return array{client: IntegrationClient, token: string}
     */
    public function create(string $slug, string $name, array $abilities, ?string $villageId = null): array
    {
        if (! preg_match(self::SLUG_PATTERN, $slug)) {
            throw new InvalidArgumentException('Slug hanya boleh huruf kecil, angka, dan tanda hubung (2-50 karakter), mis. "cimart".');
        }

        if (IntegrationClient::query()->where('slug', $slug)->exists()) {
            throw new InvalidArgumentException("Client integrasi \"{$slug}\" sudah ada.");
        }

        $name = trim($name);

        if ($name === '' || mb_strlen($name) > 100) {
            throw new InvalidArgumentException('Nama client wajib diisi, maksimal 100 karakter.');
        }

        $abilities = $this->validAbilities($abilities);
        $villageId = $this->resolveVillageId($villageId);

        return DB::transaction(function () use ($slug, $name, $abilities, $villageId): array {
            $client = IntegrationClient::query()->create([
                'village_id' => $villageId,
                'slug' => $slug,
                'name' => $name,
                'abilities' => $abilities,
                'is_active' => true,
            ]);

            $this->audit($client, null, 'client_created', 'Client integrasi dibuat', [
                'abilities' => $abilities,
            ]);

            return ['client' => $client, 'token' => $this->createToken($client, null)];
        });
    }

    /**
     * Mengaktifkan atau menonaktifkan client. Saat nonaktif, semua request
     * ditolak `403 integration_disabled` tanpa mencabut token.
     */
    public function setActive(IntegrationClient $client, bool $active, ?User $actor = null): IntegrationClient
    {
        return DB::transaction(function () use ($client, $active, $actor): IntegrationClient {
            $locked = IntegrationClient::query()->lockForUpdate()->findOrFail($client->getKey());

            if ($locked->is_active === $active) {
                return $locked;
            }

            $locked->update(['is_active' => $active]);

            $this->audit(
                $locked,
                $actor,
                $active ? 'client_enabled' : 'client_disabled',
                $active ? 'Client integrasi diaktifkan' : 'Client integrasi dinonaktifkan',
            );

            return $locked;
        });
    }

    /**
     * Rotate: menerbitkan token baru tanpa mencabut token lama, supaya
     * aplikasi bisa berganti token tanpa jeda. Token lama dicabut terpisah.
     */
    public function issueToken(IntegrationClient $client, ?User $actor = null): string
    {
        return DB::transaction(fn (): string => $this->createToken($client, $actor));
    }

    /** Mencabut satu token client; request dengan token itu langsung 401. */
    public function revokeToken(IntegrationClient $client, string $tokenId, ?User $actor = null): void
    {
        // ID bukan UUID tidak boleh sampai ke query (PostgreSQL error).
        if (! Str::isUuid($tokenId)) {
            throw (new ModelNotFoundException)->setModel(PersonalAccessToken::class, [$tokenId]);
        }

        DB::transaction(function () use ($client, $tokenId, $actor): void {
            /** @var PersonalAccessToken $token */
            $token = $client->tokens()->whereKey($tokenId)->firstOrFail();
            $token->delete();

            $this->audit($client, $actor, 'token_revoked', 'Token integrasi dicabut', [
                'token_id' => $token->id,
                'token_name' => $token->name,
            ]);
        });
    }

    /**
     * Daftar token client, terbaru lebih dulu.
     *
     * @return Collection<int, PersonalAccessToken>
     */
    public function tokens(IntegrationClient $client): Collection
    {
        return $client->tokens()->orderByDesc('created_at')->get();
    }

    /**
     * Mengganti ability client dan semua token-nya (hanya lewat artisan).
     *
     * @param  list<string>  $abilities
     */
    public function updateAbilities(IntegrationClient $client, array $abilities): IntegrationClient
    {
        $abilities = $this->validAbilities($abilities);

        return DB::transaction(function () use ($client, $abilities): IntegrationClient {
            $old = $client->abilities;

            $client->update(['abilities' => $abilities]);
            $client->tokens()->update(['abilities' => json_encode($abilities)]);

            $this->audit($client, null, 'abilities_updated', 'Hak akses client integrasi diubah', [
                'changes' => ['abilities' => ['old' => $old, 'new' => $abilities]],
            ]);

            return $client;
        });
    }

    /**
     * @param  list<string>  $abilities
     * @return list<string>
     */
    private function validAbilities(array $abilities): array
    {
        $abilities = array_values(array_unique(array_filter(array_map('trim', $abilities))));

        if ($abilities === []) {
            throw new InvalidArgumentException('Minimal satu ability. Pilihan: '.implode(', ', IntegrationAbility::values()).'.');
        }

        $unknown = array_diff($abilities, IntegrationAbility::values());

        if ($unknown !== []) {
            throw new InvalidArgumentException('Ability tidak dikenal: '.implode(', ', $unknown).'. Pilihan: '.implode(', ', IntegrationAbility::values()).'.');
        }

        return $abilities;
    }

    private function resolveVillageId(?string $villageId): string
    {
        if ($villageId !== null && $villageId !== '') {
            if (! Str::isUuid($villageId) || ! Village::query()->whereKey($villageId)->exists()) {
                throw new InvalidArgumentException('Desa tidak ditemukan.');
            }

            return $villageId;
        }

        // SID melayani satu desa; pilihan --village hanya perlu bila ada lebih dari satu.
        return Village::soleId()
            ?? throw new InvalidArgumentException('Tentukan desa dengan --village=<uuid desa>.');
    }

    private function createToken(IntegrationClient $client, ?User $actor): string
    {
        $newToken = $client->createToken($client->slug.'-'.now()->format('Ymd-His'), $client->abilities);

        $this->audit($client, $actor, 'token_issued', 'Token integrasi diterbitkan', [
            'token_id' => $newToken->accessToken->getKey(),
            'token_name' => $newToken->accessToken->name,
        ]);

        return $newToken->plainTextToken;
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    private function audit(IntegrationClient $client, ?User $actor, string $event, string $description, array $properties = []): void
    {
        activity(IntegrationAudit::LOG_NAME)
            ->performedOn($client)
            ->causedBy($actor)
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
