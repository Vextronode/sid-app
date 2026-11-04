<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RejectAccountRegistrationRequest;
use App\Http\Resources\AccountRegistrationResource;
use App\Models\AccountRegistration;
use App\Services\AccountActivationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Aktivasi akun warga hasil pendaftaran online, untuk RT, RW, Kepala Dusun,
 * dan Staf SIDUTama. Siapa yang memegang dan melihat apa diatur
 * AccountActivationService.
 */
class AccountRegistrationController extends Controller
{
    public function __construct(
        protected AccountActivationService $activation,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([
                AccountRegistration::STATUS_PENDING,
                AccountRegistration::STATUS_APPROVED,
                AccountRegistration::STATUS_REJECTED,
            ])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $registrations = $this->activation->paginateFor($request->user(), $filters);

        return response()->json([
            'data' => $registrations->getCollection()->map(
                fn (AccountRegistration $registration) => new AccountRegistrationResource($registration, $request->user(), $this->activation),
            ),
            'meta' => [
                'current_page' => $registrations->currentPage(),
                'per_page' => $registrations->perPage(),
                'total' => $registrations->total(),
                'last_page' => $registrations->lastPage(),
            ],
        ]);
    }

    public function photo(Request $request, AccountRegistration $accountRegistration): StreamedResponse
    {
        return $this->activation->photo($request->user(), $accountRegistration);
    }

    public function approve(Request $request, AccountRegistration $accountRegistration): JsonResponse
    {
        $this->activation->approve($request->user(), $accountRegistration);

        return response()->json(['message' => 'Akun warga diaktifkan.']);
    }

    public function reject(RejectAccountRegistrationRequest $request, AccountRegistration $accountRegistration): JsonResponse
    {
        $this->activation->reject($request->user(), $accountRegistration, $request->validated('notes'));

        return response()->json(['message' => 'Pendaftaran akun ditolak.']);
    }

    public function manualActivation(Request $request, AccountRegistration $accountRegistration): JsonResponse
    {
        $result = $this->activation->manualActivate($request->user(), $accountRegistration);

        return response()->json([
            'message' => 'Akun diaktifkan manual. Berikan kata sandi sementara secara langsung.',
            'temporary_password' => $result['temporary_password'],
        ]);
    }
}
