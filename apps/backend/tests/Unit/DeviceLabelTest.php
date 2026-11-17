<?php

namespace Tests\Unit;

use App\Support\DeviceLabel;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DeviceLabelTest extends TestCase
{
    public static function userAgents(): array
    {
        return [
            'chrome android' => [
                'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
                'Chrome · Android',
            ],
            'samsung internet' => [
                'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
                'Samsung Internet · Android',
            ],
            'edge windows' => [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
                'Edge · Windows',
            ],
            'firefox linux' => [
                'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
                'Firefox · Linux',
            ],
            'safari iphone' => [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
                'Safari · iOS',
            ],
            'safari mac' => [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
                'Safari · macOS',
            ],
            'unknown browser known os' => ['SomeBot/1.0 (Windows NT 10.0)', 'Browser lain · Windows'],
        ];
    }

    #[DataProvider('userAgents')]
    public function test_it_summarises_browser_and_os(string $userAgent, string $expected): void
    {
        $this->assertSame($expected, DeviceLabel::fromUserAgent($userAgent));
    }

    public function test_it_returns_null_for_empty_or_unrecognised_user_agent(): void
    {
        $this->assertNull(DeviceLabel::fromUserAgent(null));
        $this->assertNull(DeviceLabel::fromUserAgent('   '));
        $this->assertNull(DeviceLabel::fromUserAgent('curl/8.4.0'));
    }
}
