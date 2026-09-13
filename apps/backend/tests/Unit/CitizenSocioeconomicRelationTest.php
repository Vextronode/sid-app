<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CitizenSocioeconomicRelationTest extends TestCase
{
    #[Test]
    public function socioeconomic_relation_is_deferred_until_sprint_three(): void
    {
        $this->markTestSkipped(
            'Blocked by EV5-3-S3: CitizenSocioeconomic model and migration are Sprint 3 work.',
        );
    }
}
