<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterSignature;
use App\Models\SignatureBlock;
use App\Models\User;
use App\Notifications\LetterStatusNotification;
use App\Repositories\CitizenRepository;
use App\Repositories\UserRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Validation\ValidationException;

/**
 * Saksi dan persetujuan pihak terkait pada surat (isian NIK ber-`witness`
 * di form_fields, mis. saksi kelahiran, pasangan dari KK lain, kepala KK
 * tujuan). Tidak ada tanda tangan digital: surat ditandatangani basah.
 *  - warga desa yang punya akun diminta persetujuannya per surat;
 *  - warga desa tanpa akun dicatat untuk diverifikasi RT;
 *  - NIK di luar data penduduk dicatat sebagai isian manual.
 *
 * Surat baru masuk ke tahap approval setelah semua saksi terisi. Pembatas
 * penolakan, blokir, dan masa berlaku permintaan berlaku untuk tiap saksi.
 */
class LetterSignatureService
{
    public function __construct(
        protected CitizenRepository $citizenRepository,
        protected UserRepository $userRepository,
    ) {}

    /**
     * Slot saksi dari definisi form: isian NIK ber-`witness` (label saksi).
     *
     * @return array<int, array{key: string, label: string, name_field: ?string, family_field: ?string}>
     */
    public function witnessSlots(Letter $letter): array
    {
        $fields = $letter->letterType?->form_fields ?? [];
        $slots = [];

        foreach ($fields as $field) {
            if (! isset($field['witness'], $field['name'])) {
                continue;
            }

            $companion = fn (string $value): ?string => collect($fields)->first(
                fn (array $other): bool => ($other['from_nik'] ?? null) === $field['name']
                    && ($other['from_nik_value'] ?? 'name') === $value,
            )['name'] ?? null;

            $slots[] = [
                'key' => (string) $field['name'],
                'label' => (string) $field['witness'],
                'name_field' => $companion('name'),
                'family_field' => $companion('family_number'),
            ];
        }

        return $slots;
    }

    /**
     * Mencatat saksi yang diisi di form saat pengajuan.
     */
    public function openWitnesses(Letter $letter, User $applicant): void
    {
        foreach ($this->witnessSlots($letter) as $slot) {
            $nik = (string) ($letter->payload[$slot['key']] ?? '');

            if ($nik !== '') {
                $this->recordWitness($letter, $applicant, $slot, $nik, "payload.{$slot['key']}");
            }
        }
    }

    /**
     * Mengganti saksi yang menolak atau kedaluwarsa. Permintaan yang masih
     * menunggu dibatalkan.
     *
     * @param  array<string, mixed>  $input  nik, dan name/family_number bila di luar data penduduk
     */
    public function refillSlot(Letter $letter, User $requester, string $slotKey, array $input): LetterSignature
    {
        $slot = collect($this->witnessSlots($letter))->firstWhere('key', $slotKey);

        if ($slot === null) {
            abort(404, 'Saksi tidak ditemukan.');
        }

        $current = $this->current($letter)->get($slotKey);

        if ($current?->status === LetterSignature::STATUS_SIGNED) {
            abort(409, 'Saksi ini sudah menyetujui.');
        }

        if ($current?->status === LetterSignature::STATUS_PENDING) {
            $current->update(['status' => LetterSignature::STATUS_CANCELLED, 'responded_at' => now()]);
        }

        return $this->replaceWitness($letter, $requester, $slot, $input);
    }

    /**
     * Keadaan terkini tiap saksi (baris terbaru per slot), dengan permintaan
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

        foreach ($this->witnessSlots($letter) as $slot) {
            $row = $current->get($slot['key']);

            // Saksi yang tidak diisi (isian opsional) tidak ditunggu.
            if ($row === null && empty($letter->payload[$slot['key']])) {
                continue;
            }

            if ($row?->status !== LetterSignature::STATUS_SIGNED) {
                return false;
            }
        }

        return true;
    }

    /**
     * Permintaan saksi yang menunggu keputusan akun ini.
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

        $request->update([
            'status' => LetterSignature::STATUS_SIGNED,
            'signer_user_id' => $user->id,
            'signer_name' => $user->citizen?->name ?? $user->name,
            'responded_at' => now(),
        ]);

        $request->requester?->notify(new LetterStatusNotification(
            $request->letter,
            'Saksi Menyetujui',
            "Permintaan menjadi \"{$request->slot_label}\" telah disetujui.",
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
            'Permintaan Saksi Ditolak',
            "Permintaan menjadi \"{$request->slot_label}\" ditolak. Ganti saksi di rincian surat.",
            'signature_rejected',
        ));

        return $request;
    }

    /**
     * @param  array{key: string, label: string, name_field: ?string, family_field: ?string}  $slot
     */
    private function recordWitness(Letter $letter, User $requester, array $slot, string $nik, string $errorKey): LetterSignature
    {
        $nikHash = hash('sha256', $nik);

        if ($nikHash === $requester->citizen?->nik_hash) {
            throw ValidationException::withMessages([$errorKey => ['Saksi tidak boleh pemohon sendiri.']]);
        }

        $citizen = $this->citizenRepository->findActiveInVillageByNik($letter->village_id, $nik);
        $target = $citizen ? $this->userRepository->findByCitizenId($citizen->id) : null;
        $base = [
            'letter_id' => $letter->id,
            'slot_key' => $slot['key'],
            'slot_label' => $slot['label'],
            'signer_type' => LetterSignature::SIGNER_WITNESS,
            'requested_by' => $requester->id,
            'target_nik_hash' => $nikHash,
        ];

        // Warga desa yang punya akun: minta persetujuan.
        if ($target !== null && $target->is_active) {
            if ($this->isRateLimited($requester, $nikHash) || $this->isBlocked($requester, $target)) {
                throw ValidationException::withMessages([$errorKey => ['NIK saksi ini tidak dapat dipakai saat ini.']]);
            }

            $request = LetterSignature::query()->create([
                ...$base,
                'method' => LetterSignature::METHOD_CONSENT,
                'status' => LetterSignature::STATUS_PENDING,
                'expires_at' => now()->addDays(config('letters.signature.request_ttl_days')),
            ]);

            // Saksi, atau pihak lain yang diminta persetujuannya (mis. kepala KK tujuan).
            $witness = str_starts_with($slot['label'], 'Saksi');
            $target->notify(new LetterStatusNotification(
                $letter,
                $witness ? 'Permintaan Menjadi Saksi' : 'Permintaan Persetujuan',
                $witness
                    ? "{$letter->applicant_name} meminta Anda menjadi \"{$slot['label']}\" pada pengajuan suratnya."
                    : "{$letter->applicant_name} meminta persetujuan Anda sebagai \"{$slot['label']}\" pada pengajuan suratnya.",
                'signature_requested',
            ));

            return $request;
        }

        // Tanpa akun (diverifikasi RT) atau di luar data penduduk (manual).
        return LetterSignature::query()->create([
            ...$base,
            'method' => $citizen !== null ? LetterSignature::METHOD_RT_CHECK : LetterSignature::METHOD_MANUAL,
            'status' => LetterSignature::STATUS_SIGNED,
            'signer_name' => mb_substr((string) ($citizen?->name ?? $letter->payload[$slot['name_field'] ?? ''] ?? ''), 0, 100),
            'responded_at' => now(),
        ]);
    }

    /**
     * Mengganti saksi yang menolak/kedaluwarsa: NIK (dan nama/No. KK bila di
     * luar data penduduk) diperbarui di isian surat lalu dicatat ulang.
     *
     * @param  array{key: string, label: string, name_field: ?string, family_field: ?string}  $slot
     * @param  array<string, mixed>  $input
     */
    private function replaceWitness(Letter $letter, User $requester, array $slot, array $input): LetterSignature
    {
        $nik = (string) ($input['nik'] ?? '');
        $citizen = $nik !== '' ? $this->citizenRepository->findActiveInVillageByNik($letter->village_id, $nik) : null;
        $name = trim((string) ($input['name'] ?? ''));

        if ($nik === '' || ($citizen === null && $name === '')) {
            throw ValidationException::withMessages([
                $nik === '' ? 'nik' : 'name' => [$nik === '' ? 'Isi NIK saksi.' : 'NIK tidak terdaftar: isi nama saksi.'],
            ]);
        }

        $payload = $letter->payload ?? [];
        $payload[$slot['key']] = $nik;

        if ($slot['name_field'] !== null) {
            $payload[$slot['name_field']] = $citizen?->name ?? mb_substr($name, 0, 255);
        }

        if ($slot['family_field'] !== null) {
            $payload[$slot['family_field']] = $citizen !== null
                ? $citizen->family?->no_kk
                : (preg_match('/^\d{16}$/', (string) ($input['family_number'] ?? '')) ? $input['family_number'] : null);
        }

        $letter->update(['payload' => $payload]);

        return $this->recordWitness($letter, $requester, $slot, $nik, 'nik');
    }

    /**
     * Blokir warga desa ber-akun berdasarkan NIK (daftar blokir di profil).
     */
    public function blockByNik(User $user, string $nik): SignatureBlock
    {
        if (hash('sha256', $nik) === $user->citizen?->nik_hash) {
            throw ValidationException::withMessages(['nik' => ['Anda tidak dapat memblokir diri sendiri.']]);
        }

        $citizen = $user->village_id ? $this->citizenRepository->findActiveInVillageByNik($user->village_id, $nik) : null;
        $target = $citizen ? $this->userRepository->findByCitizenId($citizen->id) : null;

        if ($target === null) {
            throw ValidationException::withMessages(['nik' => ['NIK ini tidak terdaftar sebagai akun warga desa.']]);
        }

        return SignatureBlock::query()->firstOrCreate([
            'user_id' => $user->id,
            'blocked_user_id' => $target->id,
        ]);
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
            abort(404, 'Permintaan saksi tidak ditemukan.');
        }

        if (! $request->isPending()) {
            abort(409, 'Permintaan saksi ini sudah tidak aktif.');
        }
    }
}
