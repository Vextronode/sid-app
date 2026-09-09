export class ApiError extends Error {
    constructor (code, message, details = null, status = null) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.details = details;
        this.status = status;
    }
}

export function normalizeError(error) {
    if (error.response?.data?.error) {
        const { code, message, details } = error.response.data.error;
        return new ApiError(code, message, details, error.response.status);
    }
    if (error.response?.data?.message) {
    return new ApiError(
      'UNKNOWN_ERROR',
      error.response.data.message,
      error.response.data.errors ?? null,
      error.response.status
    );
  }

  if (error.request && !error.response) {
    return new ApiError('NETWORK_ERROR', 'Tidak dapat terhubung ke server', null, null);
  }

  return new ApiError('UNKNOWN_ERROR', error.message || 'Terjadi kesalahan', null, null);
}