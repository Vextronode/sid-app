<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  ...$roles  Daftar role yang diizinkan. Route dapat
     *                            menulisnya sebagai satu argumen dipisah
     *                            koma ('role:rt,rw') maupun beberapa
     *                            argumen ('role:rt' + 'role:rw' berbeda
     *                            middleware) — keduanya didukung.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return new JsonResponse([
                'message' => 'Unauthenticated.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $allowedRoles = $this->normalizeRoles($roles);

        if ($allowedRoles->isEmpty()) {
            if (function_exists('app') && app()->bound('log')) {
                report(new \LogicException(
                    "Middleware 'role' dipanggil tanpa parameter role pada route: {$request->path()}"
                ));
            }

            return new JsonResponse([
                'message' => 'Konfigurasi otorisasi tidak valid untuk endpoint ini.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $allowedRoles->contains($user->role)) {
            return new JsonResponse([
                'message' => 'Anda tidak memiliki akses untuk aksi ini.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }

    /**
     * @param  array<int, string>  $roles
     * @return Collection<int, string>
     */
    private function normalizeRoles(array $roles): Collection
    {
        return collect($roles)
            ->flatMap(fn (string $role) => explode(',', $role))
            ->map(fn (string $role) => trim($role))
            ->filter()
            ->values();
    }
}
