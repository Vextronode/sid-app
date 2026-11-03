<?php

namespace App\Services;

use App\Models\AccountRegistration;
use App\Models\PasswordResetRequest;
use App\Models\ProfilePhotoRequest;
use App\Models\User;

/**
 * Jejak tindakan Staf SIDUTama atas akun pengguna: aktif/nonaktif, ubah
 * data akun, reset kata sandi oleh staf, dan keputusan permintaan atur
 * ulang kata sandi. Kata sandi, termasuk kata sandi sementara, tidak
 * pernah dicatat.
 *
 * Log name: `user` / `password_reset_request` / `account_registration` /
 * `profile_photo_request`. Properties: `village_id` (scoping halaman Log
 * Aktivitas), `subject_label`, dan `changes` berbentuk {field: {old, new}}.
 */
class AccountAuditService
{
    /** Kolom teknis atau rahasia yang tidak pernah masuk `changes`. */
    private const IGNORED_FIELDS = ['password', 'remember_token', 'updated_at'];

    public function statusToggled(User $target, User $actor): void
    {
        $this->write($target, $actor, $target->is_active ? 'activated' : 'deactivated', [
            'is_active' => ['old' => ! $target->is_active, 'new' => $target->is_active],
        ]);
    }

    /**
     * $before adalah salinan akun sebelum disimpan (`clone $user`).
     */
    public function updated(User $before, User $after, User $actor): void
    {
        $changes = [];

        foreach (array_keys($after->getChanges()) as $field) {
            if (! in_array($field, self::IGNORED_FIELDS, true)) {
                $changes[$field] = ['old' => $before->getAttribute($field), 'new' => $after->getAttribute($field)];
            }
        }

        if ($changes !== []) {
            $this->write($after, $actor, 'updated', $changes);
        }
    }

    public function passwordResetByStaff(User $target, User $actor): void
    {
        $this->write($target, $actor, 'password_reset_by_staff');
    }

    /**
     * Keputusan Staf SIDUTama atas permintaan atur ulang kata sandi;
     * event mengikuti status barunya (`approved` / `rejected`).
     */
    public function resetRequestHandled(PasswordResetRequest $resetRequest, User $actor): void
    {
        // Dibaca ulang: relasi `user` bisa sudah dimuat sebagian (id, village_id).
        $user = $resetRequest->user()->first();

        activity('password_reset_request')
            ->performedOn($resetRequest)
            ->causedBy($actor)
            ->event($resetRequest->status)
            ->withProperties([
                'village_id' => $user?->village_id ?? $actor->village_id,
                'subject_label' => $user ? $this->label($user) : null,
                'notes' => $resetRequest->response_notes,
                'changes' => [],
            ])
            ->log($resetRequest->status === PasswordResetRequest::STATUS_APPROVED
                ? 'Permintaan atur ulang kata sandi disetujui'
                : 'Permintaan atur ulang kata sandi ditolak');
    }

    /**
     * Keputusan aktivasi pendaftaran akun warga (D1/K4):
     * `registration_approved`, `registration_rejected` (beserta catatan),
     * atau `registration_manual_activated` oleh Staf SIDUTama.
     *
     * @param  array<string, mixed>  $extra
     */
    public function registrationDecided(AccountRegistration $registration, User $actor, string $event, array $extra = []): void
    {
        $user = $registration->user()->first();

        activity('account_registration')
            ->performedOn($registration)
            ->causedBy($actor)
            ->event($event)
            ->withProperties([
                'village_id' => $registration->village_id,
                'subject_label' => $user ? $this->label($user) : null,
                'decided_level' => $registration->decided_level,
                'notes' => $registration->decision_notes,
                ...$extra,
                'changes' => [],
            ])
            ->log(match ($event) {
                'registration_approved' => 'Pendaftaran akun disetujui',
                'registration_rejected' => 'Pendaftaran akun ditolak',
                default => 'Akun diaktifkan manual di kantor desa',
            });
    }

    /**
     * Keputusan petugas wilayah atas permintaan ganti foto profil warga.
     */
    public function photoRequestDecided(ProfilePhotoRequest $photoRequest, User $actor, string $event): void
    {
        $user = $photoRequest->user()->first();

        activity('profile_photo_request')
            ->performedOn($photoRequest)
            ->causedBy($actor)
            ->event($event)
            ->withProperties([
                'village_id' => $photoRequest->village_id,
                'subject_label' => $user ? $this->label($user) : null,
                'decided_level' => $photoRequest->decided_level,
                'notes' => $photoRequest->decision_notes,
                'changes' => [],
            ])
            ->log($event === 'profile_photo_approved' ? 'Ganti foto profil disetujui' : 'Ganti foto profil ditolak');
    }

    /**
     * @param  array<string, array{old: mixed, new: mixed}>  $changes
     */
    private function write(User $target, User $actor, string $event, array $changes = []): void
    {
        activity('user')
            ->performedOn($target)
            ->causedBy($actor)
            ->event($event)
            ->withProperties([
                'village_id' => $target->village_id ?? $actor->village_id,
                'subject_label' => $this->label($target),
                'changes' => $changes,
            ])
            ->log(match ($event) {
                'activated' => 'Akun diaktifkan',
                'deactivated' => 'Akun dinonaktifkan',
                'password_reset_by_staff' => 'Kata sandi diatur ulang oleh petugas',
                default => 'Data akun diubah',
            });
    }

    private function label(User $user): string
    {
        return $user->username ? "{$user->name} ({$user->username})" : (string) $user->name;
    }
}
