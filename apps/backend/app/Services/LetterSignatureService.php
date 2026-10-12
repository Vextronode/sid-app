<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterSignature;
use App\Models\SignatureBlock;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Validation\ValidationException;

/**
 * Slot tanda tangan pada surat (letter_types.signature_slots):
 *  - signer "applicant": memakai TTD akun pemohon.
 *  - signer "other": pihak lain. Diminta lewat NIK dan disetujui pemilik
 *    NIK per surat, atau - bila pihak itu tidak punya akun - diganti foto
 *    dokumen ber-TTD basah yang diunggah pemohon.
 *
 * Surat baru masuk ke tahap approval setelah semua slot terisi.
 */
class LetterSignatureService
{
    private const UNAVAILABLE = 'Permintaan tanda tangan ke NIK ini tidak dapat dikirim saat ini.';

    public function __construct(
        protected UserSignatureService $userSignatureService,
        protected LetterAttachmentService $letterAttachmentService,
        protected CitizenRepository $citizenRepository,
        protected UserRepository $userRepository,
    ) {}

    /**
     * @return array<int, array{key: string, label: string, signer: string}>
     */
    public function slots(Letter $letter): array
    {
        $slots = [];

        foreach ($letter->letterType?->signature_slots ?? [] as $slot) {
            if (! isset($slot['key'])) {
                continue;
            }

            $slots[] = [
                'key' => (string) $slot['key'],
                'label' => (string) ($slot['label'] ?? $slot['key']),
                'signer' => ($slot['signer'] ?? LetterSignature::SIGNER_OTHER) === LetterSignature::SIGNER_APPLICANT
                    ? LetterSignature::SIGNER_APPLICANT
                    : LetterSignature::SIGNER_OTHER,
            ];
        }

        return $slots;
    }

    /**
     * Mengisi semua slot saat pengajuan surat.
     *
     * @param  array<string, array<string, mixed>>  $signers  per slot: nik, atau name untuk TTD basah
     * @param  array<string, UploadedFile>  $wetFiles  per slot: foto dokumen ber-TTD basah
     */
    public function openForSubmission(Letter $letter, User $applicant, array $signers, array $wetFiles): void
    {
        foreach ($this->slots($letter) as $slot) {
            if ($slot['signer'] === LetterSignature::SIGNER_APPLICANT) {
                $this->signAsApplicant($letter, $applicant, $slot);

                continue;
            }

            $this->fillOtherSlot(
                $letter,
                $applicant,
                $slot,
                $signers[$slot['key']] ?? [],
                $wetFiles[$slot['key']] ?? null,
            );
        }
    }

    /**
     * Mengisi ulang satu slot pihak lain setelah ditolak, kedaluwarsa, atau
     * saat pemohon beralih ke TTD basah. Permintaan yang masih menunggu
     * dibatalkan.
     *
     * @param  array<string, mixed>  $input
     */
    public function refillSlot(Letter $letter, User $requester, string $slotKey, array $input, ?UploadedFile $wetFile): LetterSignature
    {
        $slot = collect($this->slots($letter))->firstWhere('key', $slotKey);

        if ($slot === null || $slot['signer'] !== LetterSignature::SIGNER_OTHER) {
            abort(404, 'Slot tanda tangan tidak ditemukan.');
        }

        $current = $this->current($letter)->get($slotKey);

        if ($current?->status === LetterSignature::STATUS_SIGNED) {
            abort(409, 'Slot ini sudah ditandatangani.');
        }

        if ($current?->status === LetterSignature::STATUS_PENDING) {
            $current->update(['status' => LetterSignature::STATUS_CANCELLED, 'responded_at' => now()]);
        }

        return $this->fillOtherSlot($letter, $requester, $slot, $input, $wetFile);
    }

    /**
     * Keadaan terkini tiap slot (baris terbaru per slot), dengan permintaan
     * yang lewat batas waktu ditandai kedaluwarsa.
     *
     * @return SupportCollection<string, LetterSignature>
     */
    public function current(Letter $letter): SupportCollection
    {
        LetterSignature::query()
            ->where('letter_id', $letter->id)
            ->where('status', LetterSignature::STATUS_PENDING)
            ->where('expires_at', '<', now())
            ->update(['status' => LetterSignature::STATUS_EXPIRED]);

        return LetterSignature::query()
            ->where('letter_id', $letter->id)
            ->orderBy('id')
            ->get()
            ->keyBy('slot_key');
    }

    public function isComplete(Letter $letter): bool
    {
        $current = $this->current($letter);

        foreach ($this->slots($letter) as $slot) {
            if ($current->get($slot['key'])?->status !== LetterSignature::STATUS_SIGNED) {
                return false;
            }
        }

        return true;
    }

    /**
     * Permintaan tanda tangan yang menunggu keputusan akun ini.
     *
     * @return Collection<int, LetterSignature>
     */
    public function pendingFor(User $user): Collection
    {
        $nikHash = $user->citizen?->nik_hash;

        if ($nikHash === null) {
            return new Collection;
        }

        return LetterSignature::query()
            ->where('target_nik_hash', $nikHash)
            ->where('status', LetterSignature::STATUS_PENDING)
            ->where('expires_at', '>', now())
            ->with(['letter.letterType:id,name,code', 'requester:id,name'])
            ->latest('id')
            ->get();
    }

    public function accept(LetterSignature $request, User $user): LetterSignature
    {
        $this->guardIsTarget($request, $user);

        $signature = $this->userSignatureService->active($user);

        if ($signature === null) {
            abort(422, 'Buat tanda tangan Anda terlebih dahulu sebelum menyetujui permintaan ini.');
        }

        $request->update([
            'status' => LetterSignature::STATUS_SIGNED,
            'signer_user_id' => $user->id,
            'signer_name' => $user->citizen?->name ?? $user->name,
            'user_signature_id' => $signature->id,
            'responded_at' => now(),
        ]);

        $request->requester?->notify(new LetterStatusNotification(
            $request->letter,
            'Tanda Tangan Disetujui',
            "Permintaan tanda tangan untuk \"{$request->slot_label}\" telah disetujui.",
            'signature_accepted',
        ));

        return $request;
    }

    public function reject(LetterSignature $request, User $user, ?string $notes, bool $blockRequester): LetterSignature
    {
        $this->guardIsTarget($request, $user);

        $request->update([
            'status' => LetterSignature::STATUS_REJECTED,
            'signer_user_id' => $user->id,
            'responded_at' => now(),
            'response_notes' => $notes,
        ]);

        if ($blockRequester) {
            SignatureBlock::query()->firstOrCreate([
                'user_id' => $user->id,
                'blocked_user_id' => $request->requested_by,
            ]);
        }

        // Identitas penolak tidak disebut: pemohon hanya tahu slotnya.
        $request->requester?->notify(new LetterStatusNotification(
            $request->letter,
            'Tanda Tangan Ditolak',
            "Permintaan tanda tangan untuk \"{$request->slot_label}\" ditolak. Anda dapat mengajukan ke pihak lain atau mengunggah dokumen ber-tanda tangan basah.",
            'signature_rejected',
        ));

        return $request;
    }

    /**
     * Nama dan gambar tanda tangan per slot untuk dirender ke dokumen.
     *
     * @return array<string, array{name: string, image: ?string, method: ?string}>
     */
    public function renderData(Letter $letter): array
    {
        $current = LetterSignature::query()
            ->where('letter_id', $letter->id)
            ->where('status', LetterSignature::STATUS_SIGNED)
            ->with('userSignature')
            ->orderBy('id')
            ->get()
            ->keyBy('slot_key');

        $data = [];

        foreach ($this->slots($letter) as $slot) {
            $signature = $current->get($slot['key']);

            $data[$slot['key']] = [
                'name' => $signature?->signer_name ?? '',
                'method' => $signature?->method,
                'image' => $signature?->userSignature
                    ? $this->userSignatureService->dataUri($signature->userSignature)
                    : null,
            ];
        }

        return $data;
    }

    /**
     * @param  array{key: string, label: string, signer: string}  $slot
     */
    private function signAsApplicant(Letter $letter, User $applicant, array $slot): LetterSignature
    {
        $signature = $this->userSignatureService->active($applicant);

        if ($signature === null) {
            throw ValidationException::withMessages([
                "signers.{$slot['key']}" => ['Buat tanda tangan Anda terlebih dahulu sebelum mengajukan surat ini.'],
            ]);
        }

        return LetterSignature::query()->create([
            'letter_id' => $letter->id,
            'slot_key' => $slot['key'],
            'slot_label' => $slot['label'],
            'signer_type' => LetterSignature::SIGNER_APPLICANT,
            'method' => LetterSignature::METHOD_DIGITAL,
            'status' => LetterSignature::STATUS_SIGNED,
            'requested_by' => $applicant->id,
            'signer_user_id' => $applicant->id,
            'signer_name' => $letter->applicant_name,
            'user_signature_id' => $signature->id,
            'responded_at' => now(),
        ]);
    }

    /**
     * @param  array{key: string, label: string, signer: string}  $slot
     * @param  array<string, mixed>  $input
     */
    private function fillOtherSlot(Letter $letter, User $requester, array $slot, array $input, ?UploadedFile $wetFile): LetterSignature
    {
        if ($wetFile !== null) {
            return $this->signWet($letter, $requester, $slot, $input, $wetFile);
        }

        $nik = (string) ($input['nik'] ?? '');

        if ($nik === '') {
            throw ValidationException::withMessages([
                "signers.{$slot['key']}" => ["Isi NIK penanda tangan untuk \"{$slot['label']}\", atau unggah dokumen ber-tanda tangan basah."],
            ]);
        }

        return $this->requestDigital($letter, $requester, $slot, $nik);
    }

    /**
     * @param  array{key: string, label: string, signer: string}  $slot
     * @param  array<string, mixed>  $input
     */
    private function signWet(Letter $letter, User $requester, array $slot, array $input, UploadedFile $file): LetterSignature
    {
        $name = trim((string) ($input['name'] ?? ''));

        if ($name === '') {
            throw ValidationException::withMessages([
                "signers.{$slot['key']}.name" => ["Isi nama penanda tangan untuk \"{$slot['label']}\"."],
            ]);
        }

        $attachment = $this->letterAttachmentService->store(
            $letter,
            $file,
            $requester,
            LetterAttachment::KIND_WET_SIGNATURE,
            $slot['key'],
        );

        return LetterSignature::query()->create([
            'letter_id' => $letter->id,
            'slot_key' => $slot['key'],
            'slot_label' => $slot['label'],
            'signer_type' => LetterSignature::SIGNER_OTHER,
            'method' => LetterSignature::METHOD_WET,
            'status' => LetterSignature::STATUS_SIGNED,
            'requested_by' => $requester->id,
            'signer_name' => mb_substr($name, 0, 100),
            'attachment_id' => $attachment->id,
            'responded_at' => now(),
        ]);
    }

    /**
     * Jawaban ke pemohon sengaja sama, baik NIK itu punya akun maupun
     * tidak, supaya fitur ini tidak bisa dipakai memeriksa data orang lain.
     *
     * @param  array{key: string, label: string, signer: string}  $slot
     */
    private function requestDigital(Letter $letter, User $requester, array $slot, string $nik): LetterSignature
    {
        $nikHash = hash('sha256', $nik);
        $errorKey = "signers.{$slot['key']}.nik";

        if ($nikHash === $requester->citizen?->nik_hash) {
            throw ValidationException::withMessages([
                $errorKey => ['Penanda tangan pihak lain tidak boleh pemohon sendiri.'],
            ]);
        }

        $citizen = $this->citizenRepository->findByNikHash($nikHash);
        $target = $citizen ? $this->userRepository->findByCitizenId($citizen->id) : null;

        if ($this->isRateLimited($requester, $nikHash) || $this->isBlocked($requester, $target)) {
            throw ValidationException::withMessages([$errorKey => [self::UNAVAILABLE]]);
        }

        $request = LetterSignature::query()->create([
            'letter_id' => $letter->id,
            'slot_key' => $slot['key'],
            'slot_label' => $slot['label'],
            'signer_type' => LetterSignature::SIGNER_OTHER,
            'method' => LetterSignature::METHOD_DIGITAL,
            'status' => LetterSignature::STATUS_PENDING,
            'requested_by' => $requester->id,
            'target_nik_hash' => $nikHash,
            'expires_at' => now()->addDays(config('letters.signature.request_ttl_days')),
        ]);

        $target?->notify(new LetterStatusNotification(
            $letter,
            'Permintaan Tanda Tangan',
            "{$letter->applicant_name} meminta tanda tangan Anda sebagai \"{$slot['label']}\" pada pengajuan suratnya.",
            'signature_requested',
        ));

        return $request;
    }

    private function isRateLimited(User $requester, string $nikHash): bool
    {
        $rejections = LetterSignature::query()
            ->where('requested_by', $requester->id)
            ->where('target_nik_hash', $nikHash)
            ->where('status', LetterSignature::STATUS_REJECTED)
            ->where('responded_at', '>=', now()->subHours(config('letters.signature.rejection_window_hours')))
            ->count();

        return $rejections >= config('letters.signature.max_rejections');
    }

    private function isBlocked(User $requester, ?User $target): bool
    {
        return $target !== null && SignatureBlock::query()
            ->where('user_id', $target->id)
            ->where('blocked_user_id', $requester->id)
            ->exists();
    }

    private function guardIsTarget(LetterSignature $request, User $user): void
    {
        $nikHash = $user->citizen?->nik_hash;

        if ($nikHash === null || $request->target_nik_hash !== $nikHash) {
            abort(404, 'Permintaan tanda tangan tidak ditemukan.');
        }

        if (! $request->isPending()) {
            abort(409, 'Permintaan tanda tangan ini sudah tidak aktif.');
        }
    }
}
