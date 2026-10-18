<?php

namespace App\Services;

use App\Enums\OfficialPosition;
use App\Models\Hamlet;
use App\Models\Official;
use App\Models\OfficialPositionType;
use App\Models\Village;
use App\Models\VillageOrgMember;
use App\Repositories\CitizenRepository;
use App\Repositories\HamletRepository;
use App\Repositories\LetterTypeRepository;
use App\Repositories\NewsRepository;
use App\Repositories\OfficialPositionTypeRepository;
use App\Repositories\OfficialRepository;
use App\Repositories\RegulationRepository;
use App\Repositories\VillageOrgPositionRepository;
use App\Repositories\VillageRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
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

    /**
     * Jabatan berakun yang tampil di grup Kasi/Kaur/Staf Profil Desa,
     * mendahului jenis jabatan tanpa akun yang dikelola Petugas Desa.
     */
    private const PUBLIC_STAFF_POSITIONS = [
        OfficialPosition::KasiPelayanan,
        OfficialPosition::KaurTuUmum,
    ];

    public function __construct(
        private readonly VillageRepository $villageRepository,
        private readonly NewsRepository $newsRepository,
        private readonly LetterTypeRepository $letterTypeRepository,
        private readonly RegulationRepository $regulationRepository,
        private readonly OfficialRepository $officialRepository,
        private readonly HamletRepository $hamletRepository,
        private readonly OfficialPositionTypeRepository $positionTypeRepository,
        private readonly CitizenRepository $citizenRepository,
        private readonly VillageOrgPositionRepository $orgPositionRepository,
        private readonly AnnouncementService $announcementService,
    ) {}

    /**
     * Struktur organisasi (BPD, LPM, Karang Taruna, PKK) untuk halaman
     * publik: pemegang aktif Ketua dan Wakil Ketua (null bila kosong) dan
     * daftar Anggota aktif. Hanya nama dan foto; nomor WA dan catatan tidak
     * ikut dipublikasikan.
     *
     * @return array{org_type: string, ketua: ?array, wakil_ketua: ?array, anggota: array<int, array>}
     */
    public function publicOrganization(string $orgType, ?string $villageCode = null): array
    {
        $village = $this->requireVillage($villageCode);
        $slots = $this->orgPositionRepository->allForVillage($village->id, $orgType)->keyBy('slot');

        $activeMembers = fn (string $slot) => ($slots->get($slot)?->members ?? collect())
            ->where('is_active', true)
            ->sortBy('started_at')
            ->values()
            ->map(fn (VillageOrgMember $member) => [
                'id' => $member->id,
                'name' => $member->member_name,
                'photo_url' => $member->photo_img ? Storage::disk('public')->url($member->photo_img) : null,
            ]);

        return [
            'org_type' => $orgType,
            'ketua' => $activeMembers('ketua')->first(),
            'wakil_ketua' => $activeMembers('wakil_ketua')->first(),
            'anggota' => $activeMembers('anggota')->all(),
        ];
    }

    /**
     * @return array{village: Village, latest_news: Collection, public_stats: array{total_letter_types: int, total_population: int, total_hamlets: int}}
     */
    public function home(?string $villageCode = null): array
    {
        $village = $this->requireVillage($villageCode);

        $latestNews = $this->newsRepository
            ->latestPublishedForVillage($village->id, self::LATEST_NEWS_LIMIT);

        return [
            'village' => $village,
            'latest_news' => $latestNews,
            'public_stats' => [
                'total_letter_types' => $this->letterTypeRepository->countActiveWithTemplate($village->id),
                ...$this->publicStats($villageCode),
            ],
            'announcement' => $this->announcementService->activeForVillage($village->id),
        ];
    }

    /**
     * Angka desa yang dihitung dari data, bukan disimpan: warga aktif dan
     * dusun aktif. Luas wilayah bukan bagian ini karena merupakan kolom
     * villages yang diisi Petugas Desa.
     *
     * @return array{total_population: int, total_hamlets: int}
     */
    public function publicStats(?string $villageCode = null): array
    {
        $village = $this->requireVillage($villageCode);

        return [
            'total_population' => $this->citizenRepository->countActiveByVillage($village->id),
            'total_hamlets' => $this->publicHamlets($villageCode)->count(),
        ];
    }

    public function villageProfile(?string $villageCode = null): Village
    {
        return $this->requireVillage($villageCode);
    }

    /**
     * Slot grup Kasi/Kaur/Staf di Profil Desa, berurutan: jabatan berakun
     * Kasi Pelayanan dan Kaur TU, lalu jenis jabatan aktif menurut urutan
     * yang diatur staf aplikasi, lalu staf aplikasi itu sendiri (staf_sid).
     * Jabatan yang belum terisi tetap punya slot.
     *
     * @return array<int, array{code: string, label: string}>
     */
    public function publicStaffPositions(?string $villageCode = null): array
    {
        $village = $this->requireVillage($villageCode);

        $accountSlot = fn (OfficialPosition $position) => ['code' => $position->value, 'label' => $position->label()];

        return [
            ...array_map($accountSlot, self::PUBLIC_STAFF_POSITIONS),
            ...$this->positionTypeRepository
                ->allForVillage($village->id, activeOnly: true)
                ->map(fn (OfficialPositionType $type) => ['code' => $type->code, 'label' => $type->label])
                ->all(),
            // Staf aplikasi desa tampil paling akhir, setelah staf lain
            // seperti Staf SIPADES dan Staf SISKEUDES.
            $accountSlot(OfficialPosition::StafSid),
        ];
    }

    /**
     * Perangkat desa aktif untuk halaman Profil Desa: Kepala Desa, Sekdes,
     * grup Kasi/Kaur/Staf (termasuk staf aplikasi), lalu Kepala Dusun. RT dan
     * RW tidak ditampilkan. Boleh kosong: profil desa tetap tampil walau belum ada
     * pejabat yang ditetapkan.
     *
     * @return Collection<int, Official>
     */
    public function publicOfficials(?string $villageCode = null): Collection
    {
        $village = $this->requireVillage($villageCode);
        $positions = [
            OfficialPosition::KepalaDesa->value,
            OfficialPosition::Sekdes->value,
            ...array_column($this->publicStaffPositions($villageCode), 'code'),
            OfficialPosition::Kadus->value,
        ];
        $order = array_flip($positions);

        return $this->officialRepository
            ->allActiveByPositionsAndVillage($positions, $village->id)
            ->load(['citizen', 'hamlet'])
            ->sortBy(fn (Official $official) => [$order[$official->position], $official->id])
            ->values();
    }

    /**
     * Dusun aktif desa, supaya Profil Desa menampilkan slot Kepala Dusun
     * untuk tiap dusun walau jabatannya masih kosong.
     *
     * @return Collection<int, Hamlet>
     */
    public function publicHamlets(?string $villageCode = null): Collection
    {
        return $this->hamletRepository
            ->allOrderedByName($this->requireVillage($villageCode)->id)
            ->where('is_active', true)
            ->values();
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
            ->load('citizen.occupation');

        if ($officials->isEmpty()) {
            throw new HttpException(404, 'Belum ada kontak yang tersedia saat ini.');
        }

        return $officials;
    }

    public function requireVillage(?string $villageCode = null): Village
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
