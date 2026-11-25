<?php
namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Store;
use App\Services\WhatsApp;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private function idr($n): string
    {
        return 'Rp ' . number_format((float) $n, 0, ',', '.');
    }

    // Orders I placed as a buyer (with the store's payment details)
    public function index(Request $r)
    {
        $d = $r->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $tz = config('app.timezone');
        return Order::with('items', 'store', 'review')->where('user_id', $r->user()->id)
            ->when($d['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', Carbon::parse($v)->setTimezone($tz)))
            ->when($d['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', Carbon::parse($v)->setTimezone($tz)))
            ->latest()->limit(500)->get();
    }

    // Orders received by my store
    public function sales(Request $r)
    {
        $s = Store::of($r->user());
        abort_if(!$s, 422, 'Buka toko dulu di menu Jual.');
        return Order::with('items', 'user:id,name')->where('store_id', $s->id)->latest()->limit(100)->get();
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'customer_name' => 'required|string|max:80', 'phone' => ['required', 'regex:/^[0-9+\- ]{8,20}$/'],
            'address' => 'required|string|max:300', 'note' => 'nullable|string|max:200', 'coupon' => 'nullable|string|max:30',
            'items' => 'required|array|min:1|max:30', 'items.*.product_id' => 'required|integer',
            'items.*.qty' => 'required|integer|min:1|max:99', 'items.*.size' => 'nullable|string|max:10',
        ]);

        $lines = collect($d['items'])->groupBy(fn ($i) => $i['product_id'] . '|' . ($i['size'] ?? ''))
            ->map(fn ($g) => ['product_id' => (int) $g->first()['product_id'], 'size' => $g->first()['size'] ?? null, 'qty' => min(99, $g->sum('qty'))])->values();
        $products = Product::whereIn('id', $lines->pluck('product_id')->unique())->where('is_active', true)->get()->keyBy('id');
        $storeIds = $products->pluck('store_id')->unique();
        abort_if($storeIds->count() !== 1 || !$storeIds->first(), 422, 'Satu pesanan hanya boleh berisi barang dari satu toko.');
        $store = Store::findOrFail($storeIds->first());
        abort_if($store->user_id === $r->user()->id, 422, 'Kamu tidak bisa membeli barang dari tokomu sendiri.');

        $order = DB::transaction(function () use ($d, $lines, $products, $r, $store) {
            $sub = 0; $rows = [];
            foreach ($lines as $l) {                                   // prices and sizes are always checked against the database
                $p = $products->get($l['product_id']);
                abort_if(!$p, 422, 'Sebagian barang sudah tidak tersedia. Muat ulang halaman.');
                $sized = count($p->sizes ?? []) > 0;
                abort_if($sized && !in_array($l['size'], $p->sizes, true), 422, "Pilih ukuran untuk {$p->name}.");
                $sub += $p->final_price * $l['qty'];   // discounted price
                $rows[] = ['product_id' => $p->id, 'name' => $p->name, 'size' => $sized ? $l['size'] : null, 'price' => $p->final_price, 'qty' => $l['qty']];
            }
            $coupon = !empty($d['coupon']) ? Coupon::valid($d['coupon'], $sub, $store->id) : null;
            $disc = $coupon ? $coupon->discountFor($sub) : 0;
            $o = Order::create(['user_id' => $r->user()->id, 'store_id' => $store->id, 'subtotal' => $sub, 'discount' => $disc, 'coupon_code' => $coupon?->code,
                'total' => $sub - $disc, 'customer_name' => $d['customer_name'], 'phone' => $d['phone'], 'address' => $d['address'], 'note' => $d['note'] ?? null]);
            $o->items()->createMany($rows);
            if ($coupon) Coupon::where('id', $coupon->id)->increment('used');
            return $o->load('items', 'store');
        });

        $lines = $order->items->map(fn ($i) => "• {$i->qty} × {$i->name}" . ($i->size ? " ({$i->size})" : '') . ' = ' . $this->idr($i->price * $i->qty))->implode("\n");
        WhatsApp::send("🛍️ *Pesanan baru #{$order->id}* ({$store->name})\n\n👤 {$order->customer_name}\n📞 {$order->phone}\n📍 {$order->address}\n\n{$lines}\n"
            . ($order->coupon_code ? "\n🏷️ Kupon {$order->coupon_code}: -" . $this->idr($order->discount) : '')
            . "\n*Total: " . $this->idr($order->total) . "*\n💳 Menunggu pembayaran" . ($order->note ? "\n📝 {$order->note}" : ''), $store->whatsapp);

        return response()->json($order, 201);
    }

    public function update(Request $r, $id)   // the store owner changes the status of their own orders
    {
        $s = Store::of($r->user());
        abort_if(!$s, 403, 'Bukan tokomu.');
        $o = Order::where('store_id', $s->id)->findOrFail($id);
        $o->update($r->validate(['status' => 'required|in:pending,paid,shipped,done,cancelled']));
        return $o;
    }

    public function review(Request $r, $id)
    {
        $d = $r->validate(['rating' => 'required|integer|min:1|max:5', 'comment' => 'nullable|string|max:300']);
        $o = Order::where('user_id', $r->user()->id)->findOrFail($id);
        abort_if($o->status !== 'done', 422, 'Ulasan bisa diberikan setelah pesanan selesai.');
        abort_if(Review::where('order_id', $o->id)->exists(), 422, 'Pesanan ini sudah diulas.');
        return response()->json(Review::create($d + ['order_id' => $o->id, 'store_id' => $o->store_id, 'user_id' => $r->user()->id]), 201);
    }
}