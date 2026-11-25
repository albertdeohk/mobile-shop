<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    private function out(User $u): array
    {
        return ['token' => $u->createToken('mobile')->plainTextToken, 'user' => $this->profile($u)];
    }

    private function profile(User $u): array
    {
        return ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role];
    }

    public function register(Request $r)
    {
        $d = $r->validate(['name' => 'nullable|string|max:60', 'email' => 'required|email|unique:users,email', 'password' => 'required|min:8']);
        $u = new User();
        $u->forceFill([
            'name' => $d['name'] ?? explode('@', $d['email'])[0],
            'email' => $d['email'],
            'password' => Hash::make($d['password']),
            'role' => User::count() === 0 ? 'admin' : 'user',   // the first account becomes the admin
            'is_active' => true,
        ])->save();
        return $this->out($u->refresh());
    }

    public function login(Request $r)
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $u = User::where('email', $d['email'])->first();
        if (!$u || !Hash::check($d['password'], $u->password)) {
            return response()->json(['message' => 'Wrong email or password.'], 422);
        }
        if (!$u->is_active) {
            return response()->json(['message' => 'This account is disabled.'], 403);
        }
        return $this->out($u);
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
        return ['ok' => true];
    }

    public function me(Request $r)
    {
        return $this->profile($r->user());
    }

    public function update(Request $r)
    {
        $d = $r->validate(['name' => 'sometimes|string|max:60', 'password' => 'sometimes|min:8', 'current_password' => 'required_with:password']);
        $u = $r->user();
        if (isset($d['password'])) {
            if (!Hash::check($d['current_password'], $u->password)) {
                return response()->json(['message' => 'Current password is wrong.'], 422);
            }
            $u->forceFill(['password' => Hash::make($d['password'])]);
        }
        if (isset($d['name'])) $u->forceFill(['name' => $d['name']]);
        $u->save();
        return $this->profile($u);
    }
}
