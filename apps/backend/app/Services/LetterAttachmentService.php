<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Lampiran surat disimpan di disk privat dan hanya dapat dibuka lewat
 * endpoint yang memeriksa hak lihat surat (LetterPolicy::view).
 */
class LetterAttachmentService
{
    private const DISK = 'private_uploads';

    public function store(
        Letter $letter,
        UploadedFile $file,
        User $uploader,
        string $kind = LetterAttachment::KIND_ATTACHMENT,
        ?string $field = null,
        ?int $resultId = null,
    ): LetterAttachment {
        $path = $file->store($this->directory($letter), self::DISK);

        try {
            return $letter->attachments()->create([
                'kind' => $kind,
                'field' => $field,
                'letter_result_id' => $resultId,
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'path' => $path,
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size' => $file->getSize() ?: 0,
                'uploaded_by' => $uploader->id,
            ]);
        } catch (\Throwable $exception) {
            Storage::disk(self::DISK)->delete($path);

            throw $exception;
        }
    }

    /**
     * Menyimpan berkas isian bertipe file dari pengajuan surat.
     *
     * @param  array<string, UploadedFile>  $fieldFiles
     */
    public function storeSubmission(Letter $letter, User $uploader, array $fieldFiles): void
    {
        foreach ($fieldFiles as $field => $file) {
            $this->store($letter, $file, $uploader, LetterAttachment::KIND_FIELD, (string) $field);
        }
    }

    public function response(Letter $letter, LetterAttachment $attachment): BinaryFileResponse
    {
        if (
            $attachment->letter_id !== $letter->id
            || ! str_starts_with($attachment->path, $this->directory($letter).'/')
            || ! Storage::disk(self::DISK)->exists($attachment->path)
        ) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        $response = response()->file(Storage::disk(self::DISK)->path($attachment->path), [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="'.addcslashes($attachment->original_name, '"\\').'"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
        $response->setPrivate();

        return $response;
    }

    public function deleteFile(LetterAttachment $attachment): void
    {
        Storage::disk(self::DISK)->delete($attachment->path);
    }

    /**
     * Dipanggil saat surat dihapus atau pengajuan gagal di tengah jalan.
     */
    public function deleteFilesFor(Letter $letter): void
    {
        Storage::disk(self::DISK)->deleteDirectory($this->directory($letter));
    }

    private function directory(Letter $letter): string
    {
        return "letter-attachments/{$letter->village_id}/{$letter->id}";
    }
}
