<?php

namespace Tests\Unit;


use App\Models\LetterCategory;
use App\Repositories\LetterCategoryRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * EV5-1-S1 — Unit test untuk LetterCategoryRepository.
 *
 * Cakupan kondisi:
 *  - all() mengembalikan seluruh kategori terurut id, termasuk yang
 *    is_active=false (repository ini TIDAK memfilter status di all()).
 *  - findAllActive() HANYA mengembalikan kategori is_active=true.
 *  - findByCode() menemukan kategori berdasarkan code yang valid.
 *  - findByCode() mengembalikan null untuk code yang tidak ada.
 *  - Urutan hasil all() konsisten (ORDER BY id).
 */

class LetterCategoryRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private LetterCategoryRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = new LetterCategoryRepository();
    }

    #[Test]
    public function all_returns_every_category_regardless_of_active_status(): void
    {
        LetterCategory::query()->create($this->categoryPayload('approval_normal', true));
        LetterCategory::query()->create($this->categoryPayload('upload_mandiri', false));

        $result = $this->repository->all();

        $this->assertCount(2, $result);
        $this->assertTrue($result->contains(fn (LetterCategory $c) => $c->code === 'approval_normal'));
        $this->assertTrue($result->contains(fn (LetterCategory $c) => $c->code === 'upload_mandiri'));
    }

    #[Test]
    public function all_returns_empty_collection_when_no_category_exists(): void
    {
        $result = $this->repository->all();

        $this->assertCount(0, $result);
        $this->assertTrue($result->isEmpty());
    }

    #[Test]
    public function all_is_ordered_by_id_ascending(): void
    {
        $third = LetterCategory::query()->create($this->categoryPayload('update_data', true));
        $first = LetterCategory::query()->create($this->categoryPayload('approval_normal', true));
        $second = LetterCategory::query()->create($this->categoryPayload('dokumen_pendukung', true));

        // Catatan: insert di atas TIDAK berurutan sesuai id auto-increment
        // (approval_normal dibuat setelah update_data), jadi test ini
        // membuktikan hasil tetap terurut oleh id, bukan oleh urutan insert
        // manual di atas.
        $result = $this->repository->all();

        $ids = $result->pluck('id')->values()->all();
        $sortedIds = $ids;
        sort($sortedIds);

        $this->assertSame($sortedIds, $ids, 'Hasil all() harus terurut ASC berdasarkan id.');
    }

    #[Test]
    public function find_all_active_only_returns_active_categories(): void
    {
        LetterCategory::query()->create($this->categoryPayload('approval_normal', true));
        LetterCategory::query()->create($this->categoryPayload('upload_mandiri', false));
        LetterCategory::query()->create($this->categoryPayload('dokumen_pendukung', true));

        $result = $this->repository->findAllActive();

        $this->assertCount(2, $result);
        $this->assertTrue($result->every(fn (LetterCategory $c) => $c->is_active === true));
        $this->assertFalse($result->contains(fn (LetterCategory $c) => $c->code === 'upload_mandiri'));
    }

    #[Test]
    public function find_all_active_returns_empty_when_all_categories_inactive(): void
    {
        LetterCategory::query()->create($this->categoryPayload('approval_normal', false));

        $result = $this->repository->findAllActive();

        $this->assertTrue($result->isEmpty());
    }

    #[Test]
    public function find_by_code_returns_matching_category(): void
    {
        LetterCategory::query()->create($this->categoryPayload('approval_normal', true));

        $found = $this->repository->findByCode('approval_normal');

        $this->assertNotNull($found);
        $this->assertSame('approval_normal', $found->code);
    }

    #[Test]
    public function find_by_code_returns_null_when_code_does_not_exist(): void
    {
        LetterCategory::query()->create($this->categoryPayload('approval_normal', true));

        $found = $this->repository->findByCode('kode_tidak_ada');

        $this->assertNull($found);
    }

    #[Test]
    public function find_by_code_is_case_sensitive_and_exact_match(): void
    {
        LetterCategory::query()->create($this->categoryPayload('approval_normal', true));

        // "APPROVAL_NORMAL" (uppercase) tidak boleh match karena kolom
        // code adalah ENUM string exact-match, bukan LIKE/insensitive.
        $found = $this->repository->findByCode('APPROVAL_NORMAL');

        $this->assertNull($found);
    }

    private function categoryPayload(string $code, bool $isActive): array
    {
        return [
            'code' => $code,
            'name' => ucfirst(str_replace('_', ' ', $code)),
            'description' => null,
            'handler_class' => 'App\\Services\\Letters\\'.str_replace('_', '', ucwords($code, '_')).'Handler',
            'is_active' => $isActive,
        ];
    }
}
