<?php

namespace App\Services;

use App\Enums\OfficialPosition;
use App\Enums\UserRole;
use App\Models\Official;
use App\Models\SignatureResetRequest;
use App\Models\User;
use App\Models\UserSignature;
use App\Notifications\SignatureResetNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tanda tangan pribadi per akun (warga maupun pejabat; terpisah dari
 * tanda tangan jabatan di tabel officials). Diisi sekali, tidak dapat
 * diubah sendiri; reset hanya oleh Staf SIDUTama dan tercatat. Berkas
 * disimpan terenkripsi di disk privat.
 *
 * TTD jabatan selain Kepala Desa (officials.signature_img) adalah salinan
 * TTD akun pejabatnya: disalin saat dipromote, dan diganti/dikosongkan
 * mengikuti TTD akun selama masih menjabat. Jabatan yang sudah berakhir
 * tidak disentuh agar surat lama tetap memakai TTD saat itu. TTD Kepala
 * Desa tetap diunggah Staf SIDUTama (OfficialService::replaceSignature).
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
            $signature = UserSignature::query()->create([
                'user_id' => $user->id,
                'path' => $path,
                'mime_type' => $file->getMimeType() ?? 'image/png',
            ]);
        } catch (\Throwable $exception) {
            Storage::disk(self::DISK)->delete($path);

            throw $exception;
        }

        $this->syncActiveOfficials($user);

        return $signature;
    }

    /**
     * Salin TTD akun ke jabatan yang sedang dipegangnya (dipanggil juga
     * saat dipromote). Tanpa TTD aktif, salinan jabatan dikosongkan.
     */
    public function syncActiveOfficials(User $user): void
    {
        $officials = Official::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNull('ended_at')
            ->where('position', '!=', OfficialPosition::KepalaDesa->value)
            ->get();

        if ($officials->isEmpty()) {
            return;
        }

        $signature = $this->active($user);
        $content = $signature !== null ? $this->content($signature) : null;

        foreach ($officials as $official) {
            $this->copyToOfficial($official, $signature, $content);
        }
    }

    private function copyToOfficial(Official $official, ?UserSignature $signature, ?string $content): void
    {
        if ($signature === null || $content === null) {
            $official->update(['signature_img' => null]);

            return;
        }

        $extension = $signature->mime_type === 'image/jpeg' ? 'jpg' : 'png';
        $path = "official-signatures/{$official->village_id}/{$official->id}/".Str::uuid().".{$extension}";
        Storage::disk(self::DISK)->put($path, $content);

        try {
            // Berkas lama tidak dihapus: snapshot surat lama merujuknya.
            $official->update(['signature_img' => $path]);
        } catch (\Throwable $exception) {
            Storage::disk(self::DISK)->delete($path);

            throw $exception;
        }
    }

    /**
     * Reset darurat oleh Staf SIDUTama. Baris dan berkas lama dipertahankan
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

        DB::transaction(function () use ($actor, $target, $signature, $reason): void {
            $signature->update([
                'revoked_at' => now(),
                'revoked_by' => $actor->id,
                'revoke_reason' => $reason,
            ]);

            // TTD yang dicabut tidak boleh terus dipakai jabatannya.
            $this->syncActiveOfficials($target);

            // Reset lewat Manajemen Pengguna juga menjawab pengajuan reset.
            $this->closeResetRequests($actor, $target);
        });

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

    /**
     * Tandai pengajuan reset pending milik akun sebagai disetujui dan
     * beri tahu pemiliknya bahwa TTD dapat diisi kembali.
     */
    public function closeResetRequests(User $actor, User $target): void
    {
        $closed = SignatureResetRequest::query()
            ->where('user_id', $target->id)
            ->where('status', SignatureResetRequest::STATUS_PENDING)
            ->update([
                'status' => SignatureResetRequest::STATUS_APPROVED,
                'handled_by' => $actor->id,
                'handled_at' => now(),
            ]);

        if ($closed > 0) {
            $target->notify(new SignatureResetNotification(
                'Pengajuan Reset Tanda Tangan Disetujui',
                'Tanda tangan Anda telah diatur ulang. Silakan isi tanda tangan baru di halaman profil.',
                'signature_reset_approved',
                'green',
            ));
        }
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
