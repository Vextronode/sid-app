<?php

namespace Tests\Unit;

use App\Support\FieldCondition;
use PHPUnit\Framework\TestCase;

class FieldConditionTest extends TestCase
{
    public function test_no_condition_always_matches(): void
    {
        $this->assertTrue(FieldCondition::matches(null, []));
        $this->assertTrue(FieldCondition::matches([], ['a' => 'b']));
    }

    public function test_equals_in_and_not_in_compare_the_answer_as_text(): void
    {
        $payload = ['jenis' => 'kk_baru', 'jumlah' => 2];

        $this->assertTrue(FieldCondition::matches(['field' => 'jenis', 'equals' => 'kk_baru'], $payload));
        $this->assertFalse(FieldCondition::matches(['field' => 'jenis', 'equals' => 'pisah_kk'], $payload));
        $this->assertTrue(FieldCondition::matches(['field' => 'jumlah', 'equals' => '2'], $payload));
        $this->assertTrue(FieldCondition::matches(['field' => 'jenis', 'in' => ['pisah_kk', 'kk_baru']], $payload));
        $this->assertFalse(FieldCondition::matches(['field' => 'jenis', 'not_in' => ['kk_baru']], $payload));
        // Isian yang tidak dijawab tidak memenuhi "equals"/"in".
        $this->assertFalse(FieldCondition::matches(['field' => 'lain', 'in' => ['x']], $payload));
        $this->assertTrue(FieldCondition::matches(['field' => 'lain', 'not_in' => ['x']], $payload));
    }

    public function test_filled_checks_whether_the_field_was_answered(): void
    {
        $this->assertTrue(FieldCondition::matches(['field' => 'nik_ayah', 'filled' => true], ['nik_ayah' => '3207']));
        $this->assertFalse(FieldCondition::matches(['field' => 'nik_ayah', 'filled' => true], ['nik_ayah' => '  ']));
        $this->assertTrue(FieldCondition::matches(['field' => 'nik_ayah', 'filled' => false], []));
    }
}
