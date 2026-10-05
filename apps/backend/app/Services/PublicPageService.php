<?php

namespace App\Services;

use App\Models\Village;
use App\Repositories\LetterTypeRepository;
use App\Repositories\NewsRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\RegulationRepository;
use App\Repositories\VillageRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PublicPageService
{
    /**
     * Jumlah berita yang ditampilkan di beranda publik. Tidak diatur
     * eksplisit di api_spec (cuma bilang "latest_news") - dibatasi biar
     * payload beranda tetap ringkas, daftar lengkap tetap ada di
     * /public/news (paginated).
     */
    private const LATEST_NEWS_LIMIT = 5;

    public function __construct(
        private readonly VillageRepository $villageRepository,
        private readonly NewsRepository $newsRepository,
        private readonly LetterTypeRepository $letterTypeRepository,
        private readonly RegulationRepository $regulationRepository,
        private readonly OfficialRepository $officialRepository,
    ) {}

    /**
     * @return array{village: Village, latest_news: Collection, public_stats: array{total_letter_types: int}}
     */
    public function home(?string $villageCode = null): array
    {
        $village = $this->requireVillage($villageCode);

        $latestNews = $this->newsRepository
            ->allForVillage($village->id, 'published')
            ->take(self::LATEST_NEWS_LIMIT)
            ->values();

        return [
            'village' => $village,
            'latest_news' => $latestNews,
            'public_stats' => [
                'total_letter_types' => $this->letterTypeRepository->allActiveWithTemplate($village->id)->count(),
            ],
        ];
    }

    public function villageProfile(?string $villageCode = null): Village
    {
        return $this->requireVillage($villageCode);
    }

    public function paginatedNews(?string $villageCode = null, int $perPage = 10): LengthAwarePaginator
    {
        $village = $this->requireVillage($villageCode);

        return $this->newsRepository->paginatePublishedForVillage($village->id, $perPage);
    }

    public function letterTypeList(?string $villageCode = null): Collection
    {
        $village = $this->requireVillage($villageCode);
        $types = $this->letterTypeRepository->allActiveWithTemplate($village->id);

        if ($types->isEmpty()) {
            throw new HttpException(404, 'Belum ada tipe surat aktif yang tersedia.');
        }

        return $types;
    }

    public function regulationList(?string $villageCode = null): Collection
    {
        $village = $this->requireVillage($villageCode);
        $regulations = $this->regulationRepository->allForVillage($village->id);

        if ($regulations->isEmpty()) {
            throw new HttpException(404, 'Belum ada peraturan desa yang diterbitkan.');
        }

        return $regulations;
    }

    public function contactUs(?string $villageCode = null): Collection
    {
        $village = $this->requireVillage($villageCode);

        $officials = $this->officialRepository
            ->allActiveByPositionsAndVillage(['kasi_pelayanan', 'kaur_tu_umum'], $village->id)
            ->load('citizen');

        if ($officials->isEmpty()) {
            throw new HttpException(404, 'Belum ada kontak yang tersedia saat ini.');
        }

        return $officials;
    }

    private function requireVillage(?string $villageCode = null): Village
    {
        if ($villageCode !== null) {
            $village = $this->villageRepository->findByCode($villageCode);
        } else {
            if ($this->villageRepository->count() > 1) {
                throw new HttpException(422, 'Parameter village_code wajib diisi pada instalasi multi-desa.');
            }
            $village = $this->villageRepository->findFirst();
        }

        if (! $village) {
            throw new HttpException(404, 'Profil desa belum tersedia.');
        }

        return $village;
    }
}
