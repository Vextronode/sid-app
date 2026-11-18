<?php

namespace App\Services;

use App\Enums\CimartApplicationStatus;
use App\Exceptions\IntegrationApiException;
use App\Models\CitizenBusiness;
use App\Models\IntegrationClient;
use App\Models\User;
use App\Notifications\CimartApplicationNotification;
use App\Support\IntegrationAudit;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Permohonan pedagang untuk API integrasi Cimart. Semua query berangkat dari
 * baseQuery(): hanya usaha di desa client, milik penduduk yang masih
 * tercatat, dan yang didaftarkan warga ke Cimart. Usaha yang tidak
 * didaftarkan tidak pernah keluar dari endpoint mana pun, dan permohonan
 * `cancelled` tidak pernah dikembalikan dalam bentuk data.
 */
class SellerApplicationService
{
    public const DEFAULT_PER_PAGE = 50;

    /** Relasi yang dibaca SellerApplicationResource. */
    private const RELATIONS = ['citizen:id,name,nik', 'letter:id,letter_number,processed_at,expires_at'];

    /**
     * @param  array{status?: string, since?: string, page?: int|string, per_page?: int|string}  $filters
     */
    public function paginate(IntegrationClient $client, array $filters): LengthAwarePaginator
    {
        $status = CimartApplicationStatus::from($filters['status'] ?? CimartApplicationStatus::Pending->value);
        $perPage = (int) ($filters['per_page'] ?? self::DEFAULT_PER_PAGE);
        $page = (int) ($filters['page'] ?? 1);

        $applications = $this->baseQuery($client)
            ->where('cimart_status', $status)
            ->when($filters['since'] ?? null, fn (Builder $query, string $since) => $query->where('cimart_requested_at', '>', Carbon::parse($since)))
            ->with(self::RELATIONS)
            // Antrean: permohonan paling lama lebih dulu, id pemecah urutan yang sama.
            ->orderBy('cimart_requested_at')
            ->orderBy('id')
            ->paginate($perPage, ['*'], 'page', $page);

        IntegrationAudit::record($client, 'applications_listed', 'Daftar permohonan pedagang diambil', [
            'status' => $status->value,
            'page' => $applications->currentPage(),
            'count' => $applications->count(),
        ]);

        return $applications;
    }

    public function show(IntegrationClient $client, string $businessRef): CitizenBusiness
    {
        $business = $this->baseQuery($client)->with(self::RELATIONS)->find($businessRef);

        if ($business === null) {
            abort(404);
        }

        if ($business->cimart_status === CimartApplicationStatus::Cancelled) {
            $this->recordCancelledSeen($client, $businessRef);

            throw IntegrationApiException::applicationCancelled();
        }

        IntegrationAudit::record($client, 'application_read', 'Detail permohonan pedagang dibaca', [
            'business_ref' => $businessRef,
        ]);

        return $business;
    }

    /**
     * Laporan hasil dari Cimart. Baris usaha dikunci dengan kunci yang sama
     * dengan CitizenBusinessService::cancelCimart(), jadi laporan ini dan
     * pembatalan oleh warga diproses bergantian dan hanya salah satu yang
     * berlaku.
     */
    public function report(IntegrationClient $client, string $businessRef, CimartApplicationStatus $status, ?string $note): CitizenBusiness
    {
        [$outcome, $business] = DB::transaction(function () use ($client, $businessRef, $status, $note): array {
            $locked = $this->baseQuery($client)->lockForUpdate()->find($businessRef);

            if ($locked === null) {
                return ['missing', null];
            }

            // Dicek setelah baris dikunci: pembatalan yang menang lebih dulu.
            if ($locked->cimart_status === CimartApplicationStatus::Cancelled) {
                return ['cancelled', null];
            }

            if ($locked->cimart_status === $status) {
                return ['unchanged', $locked];
            }

            if ($locked->cimart_status !== CimartApplicationStatus::Pending) {
                return ['conflict', null];
            }

            $locked->update([
                'cimart_status' => $status,
                'cimart_decided_at' => now(),
                'cimart_note' => $status === CimartApplicationStatus::Rejected ? $note : null,
            ]);

            $this->notifyOwner($locked);

            IntegrationAudit::record(
                $client,
                $status === CimartApplicationStatus::Accepted ? 'application_accepted' : 'application_rejected',
                $status === CimartApplicationStatus::Accepted ? 'Permohonan pedagang diterima Cimart' : 'Permohonan pedagang ditolak Cimart',
                ['business_ref' => $businessRef],
            );

            return ['updated', $locked];
        });

        return match ($outcome) {
            'missing' => abort(404),
            'cancelled' => $this->rejectCancelled($client, $businessRef),
            'conflict' => throw IntegrationApiException::applicationAlreadyProcessed(),
            default => $business->load(self::RELATIONS),
        };
    }

    /**
     * Usaha yang boleh dilihat client ini: desa client, pemilik masih
     * tercatat sebagai penduduk, dan didaftarkan warga ke Cimart.
     *
     * @return Builder<CitizenBusiness>
     */
    private function baseQuery(IntegrationClient $client): Builder
    {
        return CitizenBusiness::query()
            ->where('village_id', $client->village_id)
            ->whereNotNull('citizen_id')
            ->whereNotNull('cimart_status');
    }

    private function notifyOwner(CitizenBusiness $business): void
    {
        $owners = User::query()->where('citizen_id', $business->citizen_id)->get();

        if ($owners->isNotEmpty()) {
            Notification::send($owners, new CimartApplicationNotification($business));
        }
    }

    private function rejectCancelled(IntegrationClient $client, string $businessRef): never
    {
        $this->recordCancelledSeen($client, $businessRef);

        throw IntegrationApiException::applicationCancelled();
    }

    private function recordCancelledSeen(IntegrationClient $client, string $businessRef): void
    {
        IntegrationAudit::record($client, 'application_cancelled_seen', 'Cimart menerima status permohonan dibatalkan pemohon', [
            'business_ref' => $businessRef,
        ]);
    }
}
