<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\UserSignature;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tanda tangan pribadi per akun (warga maupun pejabat; terpisah dari
 * tanda tangan jabatan di tabel officials). Diisi sekali, tidak dapat
 * diubah sendiri; reset hanya oleh Petugas Desa dan tercatat. Berkas
 * disimpan terenkripsi di disk privat.
 */
class UserSignatureService
{
    private const DISK = 'private_uploads';

    public function active(User $user): ?UserSignature
    {
        return UserSignature::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->latest('id')
            ->first();
    }

    public function create(User $user, UploadedFile $file): UserSignature
    {
        if ($this->active($user) !== null) {
            abort(409, 'Tanda tangan sudah tersimpan dan tidak dapat diubah. Hubungi '.UserRole::stafSidLabel().' bila perlu direset.');
        }

        $path = "user-signatures/{$user->id}/".Str::uuid().'.enc';
        Storage::disk(self::DISK)->put($path, Crypt::encryptString($file->getContent()));

        try {
            return UserSignature::query()->create([
                'user_id' => $user->id,
                'path' => $path,
                'mime_type' => $file->getMimeType() ?? 'image/png',
            ]);
        } catch (\Throwable $exception) {
            Storage::disk(self::DISK)->delete($path);

            throw $exception;
        }
    }

    /**
     * Reset darurat oleh Petugas Desa. Baris dan berkas lama dipertahankan
     * agar dokumen yang sudah ditandatangani tetap dapat dirender.
     */
    public function reset(User $actor, User $target, string $reason): void
    {
        if (
            $actor->role !== 'staf_sid'
            || ! $actor->is_active
            || $actor->village_id === null
            || $actor->village_id !== $target->village_id
        ) {
            abort(403, 'Reset tanda tangan hanya dapat dilakukan '.UserRole::stafSidLabel().' di desa yang sama.');
        }

        $signature = $this->active($target);

        if ($signature === null) {
            abort(404, 'Akun ini belum memiliki tanda tangan.');
        }

        $signature->update([
            'revoked_at' => now(),
            'revoked_by' => $actor->id,
            'revoke_reason' => $reason,
        ]);

        activity('user_signature')
            ->performedOn($target)
            ->causedBy($actor)
            ->event('reset')
            ->withProperties([
                'user_signature_id' => $signature->id,
                'reason' => $reason,
            ])
            ->log('Tanda tangan akun direset');
    }

    public function imageResponse(UserSignature $signature): Response
    {
        $content = $this->content($signature);

        if ($content === null) {
            abort(404, 'Berkas tanda tangan tidak ditemukan.');
        }

        return response($content, 200, [
            'Content-Type' => $signature->mime_type,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Gambar siap tempel untuk PDF (data URI), atau null bila berkasnya
     * tidak dapat dibaca.
     */
    public function dataUri(UserSignature $signature): ?string
    {
        $content = $this->content($signature);

        return $content === null
            ? null
            : "data:{$signature->mime_type};base64,".base64_encode($content);
    }

    private function content(UserSignature $signature): ?string
    {
        if (
            ! str_starts_with($signature->path, "user-signatures/{$signature->user_id}/")
            || ! Storage::disk(self::DISK)->exists($signature->path)
        ) {
            return null;
        }

        try {
            return Crypt::decryptString(Storage::disk(self::DISK)->get($signature->path));
        } catch (\Throwable) {
            return null;
        }
    }
}
