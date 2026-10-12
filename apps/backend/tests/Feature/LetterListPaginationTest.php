<?php

namespace Tests\Feature;

use App\Models\ApprovalFlow;
use App\Models\FlowStep;
use App\Models\Letter;
use App\Models\LetterApproval;
use App\Models\LetterType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterListPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_is_paginated_with_meta(): void
    {
        $user = User::factory()->create();
        Letter::factory()->count(5)->create(['submitted_by' => $user->id]);

        $this->actingAs($user)
            ->getJson('/api/letters?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 3);
    }

    public function test_index_defaults_to_twenty_rows_and_caps_per_page(): void
    {
        $user = User::factory()->create();
        Letter::factory()->count(22)->create(['submitted_by' => $user->id]);

        $this->actingAs($user)
            ->getJson('/api/letters')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 22);

        $this->actingAs($user)
            ->getJson('/api/letters?per_page=101')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_index_rows_omit_form_payload_and_personal_data(): void
    {
        $user = User::factory()->create();
        Letter::factory()->create([
            'submitted_by' => $user->id,
            'payload' => ['keperluan' => 'Rahasia'],
        ]);

        $row = $this->actingAs($user)
            ->getJson('/api/letters')
            ->assertOk()
            ->json('data.0');

        $this->assertArrayNotHasKey('payload', $row);
        $this->assertArrayNotHasKey('applicant_nik_masked', $row);
        $this->assertArrayNotHasKey('template', $row['letter_type']);
        $this->assertArrayNotHasKey('form_fields', $row['letter_type']);
        $this->assertSame(['id', 'name', 'code'], array_keys($row['letter_type']));
    }

    public function test_index_search_matches_applicant_and_letter_number_case_insensitively(): void
    {
        $user = User::factory()->create();
        $byName = Letter::factory()->create(['submitted_by' => $user->id, 'applicant_name' => 'Siti Aminah']);
        $byNumber = Letter::factory()->create([
            'submitted_by' => $user->id,
            'applicant_name' => 'Budi',
            'letter_number' => '470/015/DS/2026',
        ]);
        Letter::factory()->create(['submitted_by' => $user->id, 'applicant_name' => 'Joko']);

        $this->actingAs($user)
            ->getJson('/api/letters?search=AMINAH')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $byName->id);

        $this->actingAs($user)
            ->getJson('/api/letters?search=470/015')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $byNumber->id);
    }

    public function test_index_status_filter_is_applied_before_pagination(): void
    {
        $user = User::factory()->create();
        Letter::factory()->count(3)->create(['submitted_by' => $user->id, 'status' => 'pending']);
        Letter::factory()->count(2)->create(['submitted_by' => $user->id, 'status' => 'approved']);

        $this->actingAs($user)
            ->getJson('/api/letters?status=approved&per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_index_filters_by_exact_submission_time_in_the_callers_timezone(): void
    {
        $user = User::factory()->create();
        // 05.00 WIB tanggal 10 = 22.00 UTC tanggal 9; disimpan dalam zona aplikasi.
        $atUtc = fn (string $time) => Carbon::parse($time, 'UTC')->setTimezone(config('app.timezone'));
        $earlyMorning = Letter::factory()->create([
            'submitted_by' => $user->id,
            'submitted_at' => $atUtc('2026-10-09 22:00:00'),
        ]);
        Letter::factory()->create([
            'submitted_by' => $user->id,
            'submitted_at' => $atUtc('2026-10-09 10:00:00'),
        ]);

        $day = fn (string $date): string => http_build_query([
            'submitted_from' => "{$date}T00:00:00+07:00",
            'submitted_to' => "{$date}T23:59:59+07:00",
        ]);

        $this->actingAs($user)
            ->getJson('/api/letters?'.$day('2026-10-10'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $earlyMorning->id);

        $this->actingAs($user)
            ->getJson('/api/letters?'.$day('2026-10-09'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['id' => $earlyMorning->id]);
    }

    public function test_index_can_be_walked_one_letter_at_a_time(): void
    {
        $user = User::factory()->create();
        $oldest = Letter::factory()->create(['submitted_by' => $user->id, 'created_at' => now()->subDays(2)]);
        Letter::factory()->create(['submitted_by' => $user->id, 'created_at' => now()->subDay()]);
        $newest = Letter::factory()->create(['submitted_by' => $user->id, 'created_at' => now()]);

        $this->actingAs($user)
            ->getJson('/api/letters?per_page=1&page=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('meta.total', 3);

        $this->actingAs($user)
            ->getJson('/api/letters?per_page=1&page=3')
            ->assertOk()
            ->assertJsonPath('data.0.id', $oldest->id)
            ->assertJsonPath('meta.last_page', 3);
    }

    public function test_summary_counts_only_letters_in_the_callers_scope(): void
    {
        $user = User::factory()->create();
        $typeA = LetterType::factory()->create(['name' => 'Surat A']);
        $typeB = LetterType::factory()->create(['name' => 'Surat B']);

        Letter::factory()->count(2)->create(['submitted_by' => $user->id, 'status' => 'pending', 'letter_type_id' => $typeA->id]);
        Letter::factory()->create(['submitted_by' => $user->id, 'status' => 'approved', 'letter_type_id' => $typeB->id]);
        Letter::factory()->create([
            'submitted_by' => $user->id,
            'status' => 'rejected',
            'letter_type_id' => $typeB->id,
            'submitted_at' => now()->subMonths(2),
        ]);
        Letter::factory()->count(3)->create();

        $this->actingAs($user)
            ->getJson('/api/letters/summary')
            ->assertOk()
            ->assertJsonPath('data.total', 4)
            ->assertJsonPath('data.by_status.pending', 2)
            ->assertJsonPath('data.by_status.in_progress', 0)
            ->assertJsonPath('data.by_status.approved', 1)
            ->assertJsonPath('data.by_status.rejected', 1)
            ->assertJsonPath('data.by_type', [
                ['id' => $typeA->id, 'name' => 'Surat A', 'total' => 2],
                ['id' => $typeB->id, 'name' => 'Surat B', 'total' => 2],
            ])
            ->assertJsonPath('data.by_period.day.total', 3)
            ->assertJsonPath('data.by_period.day.pending', 2)
            ->assertJsonPath('data.by_period.month.approved', 1)
            ->assertJsonPath('data.by_period.month.rejected', 0);
    }

    public function test_summary_overdue_matches_the_overdue_flag_on_list_rows(): void
    {
        $user = User::factory()->create();
        $flow = ApprovalFlow::factory()->create();
        $step = FlowStep::factory()->create([
            'flow_id' => $flow->id,
            'step_order' => 1,
            'approver_position' => 'rt',
            'is_final' => false,
        ]);

        $overdue = $this->letterAtStep($user, $flow, $step, now()->subDay());
        $this->letterAtStep($user, $flow, $step, now()->addDay());
        // Sudah diputuskan: tenggat lama tidak lagi dihitung.
        $this->letterAtStep($user, $flow, $step, now()->subDay(), ['status' => 'approved']);

        $rows = collect($this->actingAs($user)->getJson('/api/letters')->assertOk()->json('data'));

        $this->assertSame([$overdue->id], $rows->where('is_overdue', true)->pluck('id')->all());

        $this->actingAs($user)
            ->getJson('/api/letters/summary')
            ->assertOk()
            ->assertJsonPath('data.overdue', 1);
    }

    public function test_summary_requires_authentication(): void
    {
        $this->getJson('/api/letters/summary')->assertUnauthorized();
    }

    private function letterAtStep(User $user, ApprovalFlow $flow, FlowStep $step, \DateTimeInterface $deadline, array $attributes = []): Letter
    {
        $letter = Letter::factory()->create(array_merge([
            'submitted_by' => $user->id,
            'flow_id' => $flow->id,
            'current_step_order' => $step->step_order,
        ], $attributes));

        LetterApproval::create([
            'letter_id' => $letter->id,
            'flow_step_id' => $step->id,
            'approval_level' => 'rt',
            'approved_by' => null,
            'action' => null,
            'deadline_at' => $deadline,
        ]);

        return $letter;
    }
}
