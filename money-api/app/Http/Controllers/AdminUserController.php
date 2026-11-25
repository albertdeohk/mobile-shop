<?php
namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

// Admin-only user management: list, enable/disable, change role, delete.
class AdminUserController extends Controller
{
    private function guard(Request $r): void
    {
        abort_unless($r->user()->role === 'admin', 403, 'Admins only.');
    }

    public function index(Request $r)
    {
        $this->guard($r);
        return User::orderBy('id')->get(['id', 'name', 'email', 'role', 'is_active']);
    }

    public function update(Request $r, $id)
    {
        $this->guard($r);
        abort_if((int) $id === $r->user()->id, 422, 'You cannot change your own account here.');
        $d = $r->validate(['role' => 'sometimes|in:user,admin', 'is_active' => 'sometimes|boolean']);
        $u = User::findOrFail($id);
        $u->forceFill($d)->save();
        if (isset($d['is_active']) && !$d['is_active']) $u->tokens()->delete();   // log them out everywhere
        return $u->only('id', 'name', 'email', 'role', 'is_active');
    }

    public function destroy(Request $r, $id)
    {
        $this->guard($r);
        abort_if((int) $id === $r->user()->id, 422, 'You cannot delete yourself.');
        User::findOrFail($id)->delete();   // their transactions and budgets are removed too
        return ['ok' => true];
    }
}
