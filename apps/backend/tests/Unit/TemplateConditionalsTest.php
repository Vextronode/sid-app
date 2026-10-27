<?php

namespace Tests\Unit;

use App\Support\TemplateConditionals;
use PHPUnit\Framework\TestCase;

class TemplateConditionalsTest extends TestCase
{
    public function test_blocks_are_kept_or_removed_by_the_answer(): void
    {
        $template = 'A{{#if warga=wna}}[WNA]{{/if}}B{{#if warga!=wna}}[BUKAN]{{/if}}C{{#if jenis=kk_baru|pisah_kk}}[KK]{{/if}}D{{#if paspor}}[PASPOR]{{/if}}';

        $this->assertSame('A[WNA]BC[KK]D[PASPOR]', TemplateConditionals::apply($template, [
            'warga' => 'wna',
            'jenis' => 'pisah_kk',
            'paspor' => 'A123',
        ]));
        $this->assertSame('AB[BUKAN]CD', TemplateConditionals::apply($template, ['warga' => 'wni', 'jenis' => 'lainnya']));
    }

    public function test_nested_blocks_and_plain_placeholders_are_left_intact(): void
    {
        $template = '{{#if warga=wna}}<p>{{ nama }}{{#if sponsor}} / {{ sponsor }}{{/if}}</p>{{/if}}';

        $this->assertSame('<p>{{ nama }}</p>', TemplateConditionals::apply($template, ['warga' => 'wna']));
        $this->assertSame('<p>{{ nama }} / {{ sponsor }}</p>', TemplateConditionals::apply($template, ['warga' => 'wna', 'sponsor' => 'PT X']));
        $this->assertSame('', TemplateConditionals::apply($template, ['warga' => 'wni', 'sponsor' => 'PT X']));
    }
}
