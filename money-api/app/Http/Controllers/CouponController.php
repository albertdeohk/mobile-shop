<?php
namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Store;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    private function myStore(Request $r): Store
    {
        $s = Store::of($r->user());
        abort_if(!$s, 422, 'Buka toko dulu di menu Jual.');
        return $s;
    }

    // Buyer: check a code for the store that is in the cart.
    public function check(Request $r)
    {
        $d = $r->validate(['code' => 'required|string|max:30', 'subtotal' => 'required|numeric|min:0', 'store_id' => 'required|integer']);
        $c = Coupon::valid($d['code'], (float) $d['subtotal'], (int) $d['store_id']);
        return ['code' => $c->code, 'label' => $c->label(), 'discount' => $c->discountFor((float) $d['subtotal'])];
    }

    public function index(Request $r)
    {
        return Coupon::where('store_id', $this->myStore($r)->id)->latest()->get();
    }

    public function store(Request $r)
    {
        $s = $this->myStore($r);
        $r->merge(['code' => strtoupper(trim((string) $r->input('code')))]);
        $d = $r->validate(['code' => 'required|alpha_dash|max:30|unique:coupons,code', 'type' => 'required|in:percent,fixed',
            'value' => 'required|numeric|min:1', 'min_spend' => 'nullable|numeric|min:0', 'max_uses' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date_format:Y-m-d']);
        abort_if($d['type'] === 'percent' && $d['value'] > 100, 422, 'Persentase tidak boleh lebih dari 100.');
        $d['min_spend'] = $d['min_spend'] ?? 0;
        return response()->json(Coupon::create($d + ['store_id' => $s->id]), 201);
    }

    public function update(Request $r, $id)
    {
        $c = Coupon::where('store_id', $this->myStore($r)->id)->findOrFail($id);
        $c->update($r->validate(['is_active' => 'required|boolean']));
        return $c;
    }

    public function destroy(Request $r, $id)
    {
        Coupon::where('store_id', $this->myStore($r)->id)->findOrFail($id)->delete();
        return ['ok' => true];
    }
}