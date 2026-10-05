<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active && ! $request->is('api/logout', 'logout')) {
            return new JsonResponse([
                'message' => 'Akun tidak aktif, hubungi administrator.',
                'code' => 'account_inactive',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
