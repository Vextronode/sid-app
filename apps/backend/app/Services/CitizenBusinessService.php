<?php

namespace App\Services;

use App\Enums\BusinessCategory;
use App\Enums\CimartApplicationStatus;
use App\Models\CitizenBusiness;
use App\Models\Letter;
use App\Models\User;
use App\Repositories\CitizenBusinessRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Data usaha warga dari Surat Keterangan Usaha (A01) dan pendaftarannya ke
 * Cimart. Pendaftaran dan pembatalan memakai kunci baris usaha yang sama
 * dengan laporan status dari Cimart, sehingga keduanya diproses bergantian
 * dan hanya salah satu yang berlaku.
 */
class CitizenBusinessService
{
    public function __construct(
        protected CitizenBusinessRepository $citizenBusinessRepository,
    ) {}

    /** Data Usaha Warga: usaha di desa pembaca (akses dicek CitizenBusinessPolicy). */
    public function paginateForVillage(User $user, array $filters = []): LengthAwarePaginator
    {
        return $this->citizenBusinessRepository->paginateForVillage((string) $user->village_id, $filters);
    }

    /**
     * Usaha Saya: usaha milik warga akun ini (users.citizen_id).
     *
     * @return Collection<int, CitizenBusiness>
     */
    public function forOwner(User $user): Collection
    {
        if ($user->citizen_id === null) {
            return new Collection;
        }

        return $this->citizenBusinessRepository->allForCitizen($user->citizen_id);
    }

    /**
     * Dipanggil saat SKU final approve, di dalam transaksinya: bila gagal,
     * final approve ikut batal. Idempoten per surat.
     */
    public function recordFromLetter(Letter $letter): ?CitizenBusiness
    {
        if ($letter->letterType?->code !== CitizenBusiness::SOURCE_LETTER_TYPE_CODE) {
            return null;
        }

        $existing = CitizenBusiness::query()->where('letter_id', $letter->id)->first();

        if ($existing !== null) {
            return $existing;
        }

        $payload = $letter->payload ?? [];

        // SKU yang diajukan sebelum form memuat data usaha: tidak ada yang dicatat.
        if (blank($payload['nama_usaha'] ?? null)) {
            return null;
        }

        $business = CitizenBusiness::query()->create([
            'village_id' => $letter->village_id,
            'citizen_id' => $letter->citizen_id,
            'letter_id' => $letter->id,
            'business_name' => Str::squish((string) $payload['nama_usaha']),
            'business_activity' => Str::squish((string) ($payload['kegiatan_usaha'] ?? '')),
            'category' => BusinessCategory::from((string) ($payload['kategori_usaha'] ?? '')),
            'email' => Str::squish((string) ($payload['email_usaha'] ?? '')),
            'phone' => self::normalizePhone((string) ($payload['telepon_usaha'] ?? '')),
            'address' => Str::squish((string) ($payload['alamat_usaha'] ?? '')),
        ]);

        if (($payload['daftar_cimart'] ?? null) === CitizenBusiness::CIMART_OPT_IN) {
            return $this->requestCimart($business);
        }

        return $business;
    }

    /**
     * Satu-satunya jalan mendaftar ke Cimart: saat SKU terbit, atau lewat
     * tombol di halaman Usaha Saya (termasuk daftar ulang).
     */
    public function requestCimart(CitizenBusiness $business): CitizenBusiness
    {
        return DB::transaction(function () use ($business): CitizenBusiness {
            $locked = $this->lock($business);

            if ($locked->letter?->expires_at?->isPast()) {
                abort(422, 'Surat Keterangan Usaha ini sudah tidak berlaku. Ajukan SKU baru untuk mendaftar ke Cimart.');
            }

            if ($locked->cimart_status === CimartApplicationStatus::Pending) {
                abort(409, 'Usaha ini sudah didaftarkan dan sedang menunggu diproses Cimart.');
            }

            if ($locked->cimart_status === CimartApplicationStatus::Accepted) {
                abort(409, 'Akun pedagang Cimart untuk usaha ini sudah dibuat.');
            }

            $locked->update([
                'cimart_status' => CimartApplicationStatus::Pending,
                'cimart_requested_at' => now(),
                'cimart_decided_at' => null,
                'cimart_note' => null,
                'cimart_cancelled_at' => null,
            ]);

            return $locked;
        });
    }

    /**
     * Warga membatalkan pendaftaran yang belum diproses Cimart; persetujuan
     * berbagi data dianggap dicabut.
     */
    public function cancelCimart(CitizenBusiness $business, User $actor): CitizenBusiness
    {
        return DB::transaction(function () use ($business, $actor): CitizenBusiness {
            $locked = $this->lock($business);

            if ($locked->cimart_status === CimartApplicationStatus::Accepted) {
                abort(409, 'Akun pedagang sudah dibuat Cimart. Hubungi Cimart untuk menghapus akun.');
            }

            if ($locked->cimart_status !== CimartApplicationStatus::Pending) {
                abort(409, 'Pendaftaran ini tidak sedang menunggu diproses Cimart.');
            }

            $locked->update([
                'cimart_status' => CimartApplicationStatus::Cancelled,
                'cimart_cancelled_at' => now(),
            ]);

            activity('citizen_business')
                ->performedOn($locked)
                ->causedBy($actor)
                ->event('cimart_cancelled')
                ->withProperties([
                    'village_id' => $locked->village_id,
                    'subject_label' => $locked->business_name,
                    'changes' => [
                        'cimart_status' => [
                            'old' => CimartApplicationStatus::Pending->value,
                            'new' => CimartApplicationStatus::Cancelled->value,
                        ],
                    ],
                ])
                ->log('Pendaftaran pedagang Cimart dibatalkan warga');

            return $locked;
        });
    }

    /** Nomor HP dinormalisasi ke format 08... (628... dan +628... diubah). */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        return str_starts_with($digits, '62') ? '0'.substr($digits, 2) : $digits;
    }

    private function lock(CitizenBusiness $business): CitizenBusiness
    {
        return CitizenBusiness::query()
            ->with('letter')
            ->lockForUpdate()
            ->findOrFail($business->getKey());
    }
}
