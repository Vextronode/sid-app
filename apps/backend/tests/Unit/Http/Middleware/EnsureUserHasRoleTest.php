<?php

namespace Tests\Unit\Http\Middleware;

use App\Http\Middleware\EnsureUserHasRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class EnsureUserHasRoleTest extends TestCase
{
    private function userWithRole(string $role): object
    {
        return new class($role)
        {
            public function __construct(public string $role) {}
        };
    }

    private function passthroughNext(): \Closure
    {
        return fn (Request $request) => new JsonResponse(['ok' => true], 200);
    }

    #[Test]
    public function it_allows_request_when_role_matches_single_allowed_role(): void
    {
        $request = Request::create('/api/rt/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('rt'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'rt');

        $this->assertSame(200, $response->getStatusCode());
    }

    #[Test]
    public function it_allows_request_when_role_matches_one_of_several_comma_separated_roles(): void
    {
        $request = Request::create('/api/kades/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('sekretaris_desa'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'kepala_desa,sekretaris_desa');

        $this->assertSame(200, $response->getStatusCode());
    }

    #[Test]
    public function it_allows_request_when_roles_are_passed_as_separate_arguments(): void
    {
        // Laravel biasanya mem-parse "role:a,b" menjadi satu argumen
        // "a,b", tapi middleware ini juga mendukung beberapa argumen
        // terpisah untuk kelenturan pemanggilan langsung.
        $request = Request::create('/api/kasi/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('kaur_tu_umum'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'kasi_pelayanan', 'kaur_tu_umum');

        $this->assertSame(200, $response->getStatusCode());
    }

    #[Test]
    public function it_rejects_with_403_when_role_not_in_allowed_list(): void
    {
        $request = Request::create('/api/kades/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('warga'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'kepala_desa,sekretaris_desa');

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame(
            'Anda tidak memiliki akses untuk aksi ini.',
            json_decode($response->getContent(), true)['message']
        );
    }

    #[Test]
    public function it_rejects_with_401_when_no_authenticated_user(): void
    {
        $request = Request::create('/api/rt/letters', 'GET');
        $request->setUserResolver(fn () => null);

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'rt');

        $this->assertSame(401, $response->getStatusCode());
        $this->assertSame('Unauthenticated.', json_decode($response->getContent(), true)['message']);
    }

    #[Test]
    public function it_fails_closed_with_403_when_no_role_parameter_configured(): void
    {
        // Guard konfigurasi: middleware dipasang tanpa parameter role
        // sama sekali (bug route) harus fail-closed (403), bukan
        // meloloskan siapa pun yang login (fail-open).
        $request = Request::create('/api/some-endpoint', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('petugas_desa'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext());

        $this->assertSame(403, $response->getStatusCode());
    }

    #[Test]
    public function it_does_not_call_next_closure_when_rejected(): void
    {
        $request = Request::create('/api/kades/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('warga'));

        $called = false;
        $next = function (Request $req) use (&$called) {
            $called = true;

            return new JsonResponse(['ok' => true], 200);
        };

        $middleware = new EnsureUserHasRole;
        $middleware->handle($request, $next, 'kepala_desa,sekretaris_desa');

        $this->assertFalse($called, 'Closure $next tidak boleh dipanggil ketika role ditolak.');
    }

    #[Test]
    public function it_trims_whitespace_in_role_list(): void
    {
        $request = Request::create('/api/kades/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('kepala_desa'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'kepala_desa, sekretaris_desa');

        $this->assertSame(200, $response->getStatusCode());
    }

    /**
     * Regression guard (SID-ARCH-BE-001 S3.2): RW tidak pernah menjadi
     * approver_position di flow_steps manapun sejak v5.0 — pastikan
     * middleware role menolaknya di endpoint approval Kades/Sekdes
     * maupun Kasi/Kaur, terlepas dari context check apa pun di Policy.
     */
    #[Test]
    public function rw_role_is_rejected_from_kades_approval_route(): void
    {
        $request = Request::create('/api/kades/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('rw'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'kepala_desa,sekretaris_desa');

        $this->assertSame(403, $response->getStatusCode());
    }

    #[Test]
    public function rw_role_is_rejected_from_kasi_approval_route(): void
    {
        $request = Request::create('/api/kasi/letters', 'GET');
        $request->setUserResolver(fn () => $this->userWithRole('rw'));

        $middleware = new EnsureUserHasRole;
        $response = $middleware->handle($request, $this->passthroughNext(), 'kasi_pelayanan,kaur_tu_umum');

        $this->assertSame(403, $response->getStatusCode());
    }

    /**
     * Regression guard (SID-ARCH-BE-001 S3.2): Kadus dihapus total dari
     * domain approval surat sejak v5.0 — middleware role harus menolak
     * di semua endpoint approval (rt, kades, kasi), meskipun akun Kadus
     * tetap valid untuk login/lihat status (UC-01/UC-05/UC-06).
     */
    #[Test]
    public function kadus_role_is_rejected_from_every_approval_route(): void
    {
        $middleware = new EnsureUserHasRole;
        $scenarios = [
            ['/api/rt/letters', 'rt'],
            ['/api/kades/letters', 'kepala_desa,sekretaris_desa'],
            ['/api/kasi/letters', 'kasi_pelayanan,kaur_tu_umum'],
        ];

        foreach ($scenarios as [$uri, $allowedRoles]) {
            $request = Request::create($uri, 'GET');
            $request->setUserResolver(fn () => $this->userWithRole('kadus'));

            $response = $middleware->handle($request, $this->passthroughNext(), $allowedRoles);

            $this->assertSame(403, $response->getStatusCode(), "Kadus seharusnya ditolak di {$uri}");
        }
    }
}
