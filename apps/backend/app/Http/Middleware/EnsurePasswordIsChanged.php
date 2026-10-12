<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            $user?->must_change_password &&
            ! $request->is('api/user', 'api/profile/password', 'logout')
        ) {
            return new JsonResponse([
                'message' => 'Anda harus mengganti password terlebih dahulu.',
                'code' => 'password_change_required',
            ], 403);
        }

        return $next($request);
    }
}
