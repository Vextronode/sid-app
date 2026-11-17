<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Error API integrasi yang dibaca klien lewat `code` (lihat kontrak
 * docs/thirdparty/cimart/api-spec/openapi.yaml). Turunan HttpException, jadi
 * tidak dicatat sebagai error server.
 */
class IntegrationApiException extends HttpException
{
    public function __construct(int $statusCode, private readonly string $errorCode, string $message)
    {
        parent::__construct($statusCode, $message);
    }

    public static function applicationCancelled(): self
    {
        return new self(410, 'application_cancelled', 'Permohonan dibatalkan oleh pemohon.');
    }

    public static function applicationAlreadyProcessed(): self
    {
        return new self(409, 'application_already_processed', 'Permohonan sudah diproses sebelumnya.');
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->errorCode,
        ], $this->getStatusCode());
    }
}
