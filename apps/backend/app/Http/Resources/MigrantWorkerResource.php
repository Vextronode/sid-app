<?php

namespace App\Http\Resources;

use App\Models\Citizen;
use App\Repositories\MigrantWorkerRepository;
use App\Support\GuardianRelation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Data CPMI. Di daftar hanya ringkasan; identitas lengkap, rincian, dan
 * 10 dokumen wajib hanya di detail (`withDetail`).
 */
class MigrantWorkerResource extends JsonResource
{
    private bool $detail = false;

    public function withDetail(): static
    {
        $this->detail = true;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $summary = [
            'id' => $this->id,
            'letter_id' => $this->letter_id,
            'citizen' => $this->citizen ? ['id' => $this->citizen->id, 'name' => $this->citizen->name] : null,
            'hamlet' => $this->letter?->hamlet?->name,
            'destination_country' => $this->destination_country,
            'employer_name' => $this->employer_name,
            'agency_name' => $this->agency_name,
            'position' => $this->position,
            'contract_start' => $this->contract_start?->toDateString(),
            'contract_end' => $this->contract_end?->toDateString(),
            'contract_status' => $this->contractStatus(),
            'approved_at' => $this->letter?->processed_at,
            'created_at' => $this->created_at,
        ];

        if (! $this->detail) {
            return $summary;
        }

        return [
            ...$summary,
            'identity' => $this->identity(),
            'height_cm' => $this->height_cm,
            'weight_kg' => $this->weight_kg,
            'phone' => $this->phone,
            'email' => $this->email,
            'education_level' => $this->education_level,
            'school_name' => $this->school_name,
            'major' => $this->major,
            'graduation_year' => $this->graduation_year,
            'certificates' => $this->certificates ?? [],
            'work_history' => $this->work_history ?? [],
            'guardian_relation' => $this->guardian_relation,
            'guardian_relation_label' => GuardianRelation::label($this->guardian_relation),
            'guardian_name' => $this->guardian_name,
            'guardian_address' => $this->guardian_address,
            'guardian_phone' => $this->guardian_phone,
            'guardian_email' => $this->guardian_email,
            'employer_address' => $this->employer_address,
            'employer_contact' => $this->employer_contact,
            'agency_contact' => $this->agency_contact,
            'salary_facilities' => $this->salary_facilities,
            'documents' => LetterAttachmentResource::collection(
                $this->letter?->attachments?->where('kind', 'field')->values() ?? collect(),
            ),
        ];
    }

    private function contractStatus(): ?string
    {
        $today = now()->startOfDay();

        if ($this->contract_start !== null && $this->contract_start->gt($today)) {
            return MigrantWorkerRepository::CONTRACT_UPCOMING;
        }

        if ($this->contract_end !== null && $this->contract_end->lt($today)) {
            return MigrantWorkerRepository::CONTRACT_ENDED;
        }

        return MigrantWorkerRepository::CONTRACT_ACTIVE;
    }

    /**
     * Identitas dari data penduduk saat ini (bukan disalin), dengan nama
     * dan NIK pengajuan sebagai cadangan bila warga sudah terhapus.
     *
     * @return array<string, mixed>
     */
    private function identity(): array
    {
        /** @var Citizen|null $citizen */
        $citizen = $this->citizen;
        $value = fn (mixed $raw) => $raw instanceof \BackedEnum ? $raw->value : $raw;

        return [
            'name' => $citizen?->name ?? $this->letter?->applicant_name,
            'nik' => $citizen?->nik ?? $this->letter?->applicant_nik,
            'place_of_birth' => $citizen?->place_of_birth,
            'date_of_birth' => $citizen?->date_of_birth?->toDateString(),
            'gender' => $value($citizen?->gender),
            'religion' => $value($citizen?->religion) ?? ($this->letter?->payload['agama'] ?? null),
            'marital_status' => $value($citizen?->marital_status) ?? ($this->letter?->payload['status_perkawinan'] ?? null),
            'mother_name' => $citizen?->mother?->name ?? $citizen?->mother_name_text,
            'address' => $citizen?->address ?? $this->letter?->applicant_address,
            'rt' => $citizen?->rt?->number,
            'rw' => $citizen?->rt?->rw?->number,
            'hamlet' => $citizen?->hamlet?->name,
        ];
    }
}
