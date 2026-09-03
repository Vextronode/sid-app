<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): Response
    {
        $request->validate([
            'village_id' => ['required'],
            'citizen_id' => ['required'],
            'role' => ['required'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'village_id' => 1,
            'citizen_id' => null,
            'name' => $request->name,
            'role' => 'warga',
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'is_active' => true,
        ]);
        event(new Registered($user));

        Auth::login($user);

        return response()->noContent();
    }
}
