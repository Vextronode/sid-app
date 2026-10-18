<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\VillageInfoPage;
use App\Support\InfoPageFields;

/**
 * Isian halaman informasi publik (PPID, Kebijakan Privasi, Aksesibilitas)
 * per desa. Halaman yang belum pernah disimpan tetap punya isian lengkap
 * dengan nilai kosong.
 */
class InfoPageService
{
    /**
     * Ketiga halaman beserta skema field-nya, untuk menu Halaman Informasi.
     *
     * @return array<int, array<string, mixed>>
     */
    public function allForStaff(User $user): array
    {
        $villageId = $this->villageId($user);
        $saved = VillageInfoPage::query()->where('village_id', $villageId)->get()->keyBy('page');

        return collect(InfoPageFields::PAGES)
            ->map(fn (array $definition, string $page) => [
                'page' => $page,
                'title' => $definition['title'],
                'schema' => collect($definition['fields'])
                    ->map(fn (array $field, string $key) => ['key' => $key, ...$field])
                    ->values()
                    ->all(),
                'fields' => InfoPageFields::normalize($page, $saved->get($page)?->fields ?? []),
                'updated_at' => $saved->get($page)?->updated_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function save(User $user, string $page, array $values): VillageInfoPage
    {
        return VillageInfoPage::query()->updateOrCreate(
            ['village_id' => $this->villageId($user), 'page' => $page],
            ['fields' => InfoPageFields::normalize($page, $values)],
        );
    }

    /**
     * @return array{fields: array<string, mixed>, updated_at: ?string}
     */
    public function publicPage(string $villageId, string $page): array
    {
        $saved = VillageInfoPage::query()->where('village_id', $villageId)->where('page', $page)->first();

        return [
            'fields' => InfoPageFields::normalize($page, $saved?->fields ?? []),
            'updated_at' => $saved?->updated_at?->toIso8601String(),
        ];
    }

    private function villageId(User $user): string
    {
        if ($user->role !== 'staf_sid' || ! $user->is_active || ! $user->village_id) {
            abort(403, UserRole::stafSidLabel().' aktif dengan desa yang valid diperlukan.');
        }

        return $user->village_id;
    }
}
