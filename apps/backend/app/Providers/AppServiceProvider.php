<?php

namespace App\Providers;

use App\Models\Hamlet;
use App\Models\PersonalAccessToken;
use App\Models\Rt;
use App\Models\Rw;
use App\Policies\RegionPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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
        //
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

        Gate::policy(Hamlet::class, RegionPolicy::class);
        Gate::policy(Rw::class, RegionPolicy::class);
        Gate::policy(Rt::class, RegionPolicy::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
