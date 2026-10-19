<?php

namespace App\Support;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Pesan error API dalam bahasa Indonesia untuk exception bawaan framework
 * (401/403/404/405/419/429/5xx), yang pesan aslinya berbahasa Inggris
 * ("Unauthenticated.", "This action is unauthorized.", dst.). Pesan kustom
 * yang sudah ditulis di kode (mis. abort(403, 'Anda tidak berwenang ...'))
 * tetap dipakai apa adanya.
 */
class ApiExceptionMessages
{
    private const BY_STATUS = [
        401 => 'Sesi Anda telah berakhir. Silakan masuk kembali.',
        403 => 'Anda tidak memiliki akses untuk aksi ini.',
        404 => 'Data tidak ditemukan.',
        405 => 'Metode permintaan tidak didukung.',
        413 => 'Ukuran data yang dikirim terlalu besar.',
        419 => 'Sesi keamanan kedaluwarsa. Muat ulang halaman lalu coba lagi.',
        429 => 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
        500 => 'Terjadi kesalahan pada server. Silakan coba lagi beberapa saat.',
        503 => 'Layanan sedang tidak tersedia. Silakan coba lagi beberapa saat.',
    ];

    /**
     * Pesan bawaan framework/Symfony (bahasa Inggris) yang perlu diganti.
     */
    private const FRAMEWORK_DEFAULTS = '/^(Unauthenticated|This action is unauthorized|Too Many Attempts|Not Found|Forbidden|Unauthorized|Method Not Allowed|Server Error|Service Unavailable|CSRF token mismatch|Page Expired|No query results for model|The route .* could not be found|The \w+ method is not supported)/i';

    public static function render(Throwable $exception): ?JsonResponse
    {
        // Validasi sudah berbahasa Indonesia lewat lang/id/validation.php.
        if ($exception instanceof ValidationException) {
            return null;
        }

        [$status, $headers] = self::statusAndHeaders($exception);

        if ($status === null) {
            return null;
        }

        $message = $exception->getMessage();

        if ($message === '' || preg_match(self::FRAMEWORK_DEFAULTS, $message) || $status >= 500 && ! config('app.debug')) {
            $message = self::BY_STATUS[$status] ?? ($status >= 500 ? self::BY_STATUS[500] : self::BY_STATUS[403]);
        }

        return response()->json(['message' => $message], $status, $headers);
    }

    /**
     * @return array{0: ?int, 1: array<string, string>}
     */
    private static function statusAndHeaders(Throwable $exception): array
    {
        return match (true) {
            $exception instanceof AuthenticationException => [401, []],
            $exception instanceof AuthorizationException => [$exception->status() ?? 403, []],
            $exception instanceof ModelNotFoundException => [404, []],
            $exception instanceof TokenMismatchException => [419, []],
            $exception instanceof HttpExceptionInterface => [$exception->getStatusCode(), $exception->getHeaders()],
            // Error tak terduga: detailnya hanya ditampilkan saat debug.
            default => config('app.debug') ? [null, []] : [500, []],
        };
    }
}
