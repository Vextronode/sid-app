<?php

namespace Tests\Unit;

use App\Models\LetterType;
use App\Models\Village;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthApprovalMigrationsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function username_is_required(): void
    {
        $user = $this->userRow();
        unset($user['username']);

        $this->expectException(QueryException::class);

        DB::table('users')->insert($user);
    }

    #[Test]
    public function email_is_nullable_and_multiple_users_can_have_no_email(): void
    {
        DB::table('users')->insert($this->userRow());
        DB::table('users')->insert($this->userRow());

        $this->assertSame(2, DB::table('users')->whereNull('email')->count());
    }

    #[Test]
    public function must_change_password_defaults_to_false(): void
    {
        $user = $this->userRow();
        DB::table('users')->insert($user);

        $this->assertFalse((bool) DB::table('users')->where('id', $user['id'])->value('must_change_password'));
    }

    #[Test]
    public function officials_have_a_term_end_date_column(): void
    {
        $this->assertTrue(Schema::hasColumn('officials', 'term_ends_at'));
    }

    #[Test]
    public function letter_number_counters_enforce_unique_village_type_and_year(): void
    {
        $village = Village::factory()->create();
        $letterType = LetterType::factory()->create();
        $counter = [
            'village_id' => $village->id,
            'letter_type_id' => $letterType->id,
            'year' => 2026,
            'last_number' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('letter_number_counters')->insert($counter);

        $this->expectException(QueryException::class);

        DB::table('letter_number_counters')->insert($counter);
    }

    #[Test]
    public function merged_username_migration_file_is_absent(): void
    {
        $this->assertSame([], glob(database_path('migrations/*add_username_to_users_table*')));
    }

    private function userRow(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'name' => 'Warga Uji',
            'username' => 'uji.'.Str::random(10),
            'email' => null,
            'password' => 'hashed-password',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
