<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Citizen;
use App\Models\Family;
use App\Models\FamilySocioeconomic;
use App\Models\Hamlet;
use App\Models\IntegrationClient;
use App\Models\Letter;
use App\Models\LetterType;
use App\Models\News;
use App\Models\NewsCategory;
use App\Models\Official;
use App\Models\OfficialPositionType;
use App\Models\PersonalAccessToken;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use App\Models\VillageInfoPage;
use App\Models\VillageOrgMember;
use App\Models\VillageOrgPosition;
use App\Models\VillageRegulation;
use App\Observers\LetterRealtimeObserver;
use App\Observers\PopulationAuditObserver;
use App\Policies\RegionPolicy;
use App\Support\AuditContext;
use App\Support\IntegrationAudit;
use App\Support\OfficialPositionCatalog;
use App\Support\PublicPageCache;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /** Batas request API integrasi per client (nilai awal di kontrak Cimart). */
    public const INTEGRATION_REQUESTS_PER_MINUTE = 60;

    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(OfficialPositionCatalog::class);
        $this->app->scoped(AuditContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Jejak audit data kependudukan (S-05) lewat observer, bukan
        // pemanggilan manual di tiap service.
        foreach ([Citizen::class, Family::class, FamilySocioeconomic::class] as $populationModel) {
            $populationModel::observe(PopulationAuditObserver::class);
        }

        // Sinyal realtime (Reverb) setiap kali surat berubah, dari service
        // mana pun; lihat docs/task/feature/realtime-reverb.md.
        Letter::observe(LetterRealtimeObserver::class);

        // Format id parameter route dicek sebelum query: PostgreSQL melempar
        // error (500) untuk `where id = 'abc'` pada kolom bigint/uuid. Id
        // salah format langsung 404 (route tidak cocok). `{id}` biasa diberi
        // whereUuid/whereNumber per route di routes/api.php.
        Route::patterns(array_fill_keys([
            'accountRegistration', 'attachment', 'hamlet', 'letterType', 'official',
            'position', 'profilePhotoRequest', 'resetRequest', 'result', 'rt', 'rw',
            'signatureBlock', 'signatureRequest',
        ], '[0-9]+'));
        Route::patterns(array_fill_keys([
            'citizen', 'citizenBusiness', 'disasterAlert', 'family', 'integrationClient',
            'letter', 'migrantWorker', 'user',
        ], '[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}'));

        RateLimiter::for('register', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perHour(10)->by(hash('sha256', (string) $request->input('nik'))),
            ];
        });

        RateLimiter::for('password-reset-request', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perHour(5)->by(hash('sha256', (string) $request->input('nik'))),
            ];
        });

        // API integrasi: batas per client (bukan per IP), dengan `code` yang
        // dibaca klien. Pelanggaran dicatat paling banyak sekali per menit
        // agar klien yang terus mengulang tidak membanjiri activity log.
        RateLimiter::for('integration', function (Request $request) {
            $client = $request->user();
            $key = $client instanceof IntegrationClient ? 'client:'.$client->getKey() : 'ip:'.$request->ip();

            return Limit::perMinute(self::INTEGRATION_REQUESTS_PER_MINUTE)
                ->by('integration:'.$key)
                ->response(function (Request $request, array $headers) use ($client) {
                    if ($client instanceof IntegrationClient && Cache::add('integration:rate-limited:'.$client->getKey(), true, 60)) {
                        IntegrationAudit::record($client, 'rate_limited', 'Request integrasi melewati batas');
                    }

                    return response()->json([
                        'message' => 'Terlalu banyak percobaan. Coba lagi nanti.',
                        'code' => 'too_many_attempts',
                    ], 429, $headers);
                });
        });

        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        // Lazy-load di dalam koleksi (N+1) gagal keras di test dan
        // hanya dicatat di lingkungan lain, supaya tidak pernah
        // menjatuhkan request pengguna.
        Model::preventLazyLoading();
        if (! $this->app->runningUnitTests()) {
            Model::handleLazyLoadingViolationUsing(function (Model $model, string $relation): void {
                Log::warning('Lazy loading terdeteksi (N+1).', [
                    'model' => $model::class,
                    'relation' => $relation,
                ]);
            });
        }

        // Konten halaman publik di-cache; perubahan pada sumber datanya
        // langsung menggugurkan cache desa yang bersangkutan. Citizen ikut
        // karena nama pejabat (Sambutan Kepala Desa, kontak) dan jumlah
        // penduduk publik dibaca dari data warga.
        foreach ([Citizen::class, News::class, NewsCategory::class, VillageRegulation::class, LetterType::class, Official::class, Hamlet::class, Announcement::class, VillageInfoPage::class] as $publicSource) {
            $publicSource::saved(fn (Model $model) => PublicPageCache::flush($model->village_id));
            $publicSource::deleted(fn (Model $model) => PublicPageCache::flush($model->village_id));
        }
        Village::saved(fn (Village $village) => PublicPageCache::flush($village->id));

        // Struktur BPD/Lembaga publik. Anggota tidak menyimpan village_id,
        // jadi desanya dibaca dari jabatan (tanpa lazy loading).
        foreach (['saved', 'deleted'] as $event) {
            VillageOrgPosition::$event(fn (VillageOrgPosition $position) => PublicPageCache::flush($position->village_id));
            VillageOrgMember::$event(fn (VillageOrgMember $member) => PublicPageCache::flush(
                VillageOrgPosition::query()->whereKey($member->position_id)->value('village_id')
            ));
        }

        // Jenis jabatan tampil di Profil Desa publik dan menjadi label
        // jabatan pejabat, jadi keduanya ikut disegarkan.
        $refreshPositionTypes = function (OfficialPositionType $type): void {
            PublicPageCache::flush($type->village_id);
            $this->app->make(OfficialPositionCatalog::class)->forget($type->village_id);
        };
        OfficialPositionType::saved($refreshPositionTypes);
        OfficialPositionType::deleted($refreshPositionTypes);

        Gate::policy(Hamlet::class, RegionPolicy::class);
        Gate::policy(Rw::class, RegionPolicy::class);
        Gate::policy(Rt::class, RegionPolicy::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/reset-password/$token?".http_build_query([
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        });
    }
}
