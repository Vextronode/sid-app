<?php

namespace App\Providers;

use App\Models\Hamlet;
use App\Models\LetterType;
use App\Models\News;
use App\Models\NewsCategory;
use App\Models\Official;
use App\Models\OfficialPositionType;
use App\Models\PersonalAccessToken;
use App\Models\Rt;
use App\Models\Rw;
use App\Models\Village;
use App\Models\VillageRegulation;
use App\Policies\RegionPolicy;
use App\Support\OfficialPositionCatalog;
use App\Support\PublicPageCache;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(OfficialPositionCatalog::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('register', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perHour(10)->by(hash('sha256', (string) $request->input('nik'))),
            ];
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
        // langsung menggugurkan cache desa yang bersangkutan.
        foreach ([News::class, NewsCategory::class, VillageRegulation::class, LetterType::class, Official::class, Hamlet::class] as $publicSource) {
            $publicSource::saved(fn (Model $model) => PublicPageCache::flush($model->village_id));
            $publicSource::deleted(fn (Model $model) => PublicPageCache::flush($model->village_id));
        }
        Village::saved(fn (Village $village) => PublicPageCache::flush($village->id));

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
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
