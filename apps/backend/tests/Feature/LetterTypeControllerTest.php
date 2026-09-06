<?php

namespace Tests\Feature;

use App\Models\LetterType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class LetterTypeControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_active_letter_types_with_template(): void
    {
        $user = User::factory()->create();
        LetterType::factory()->create(['is_active' => true, 'template' => 'tpl', 'name' => 'Surat A']);
        LetterType::factory()->create(['is_active' => false, 'template' => 'tpl', 'name' => 'Surat B']);

        $this->actingAs($user)
            ->getJson('/api/letter-types')
            ->assertOk()
            ->assertJsonPath('message', 'Daftar jenis surat berhasil diambil.')
            ->assertJsonCount(1, 'data');
    }
}
