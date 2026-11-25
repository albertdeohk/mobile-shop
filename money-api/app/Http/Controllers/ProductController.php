<?php
namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    private function myStore(Request $r): Store
    {
        $s = Store::of($r->user());
        abort_if(!$s, 422, 'Buka toko dulu di menu Jual.');
        return $s;
    }

    // Validates the form and works out the final photo list. The "order" field says which photos to keep
    // (existing paths) and where the new uploads go ("new:0", "new:1"...). The first entry becomes the cover.
    private function data(Request $r, ?Product $p): array
    {
        $d = $r->validate([
            'name' => 'required|string|max:80', 'description' => 'nullable|string|max:1500',
            'price' => 'required|numeric|min:0|max:999999999', 'brand' => 'nullable|string|max:40', 'discount_percent' => 'nullable|integer|min:0|max:90', 'category_id' => 'nullable|exists:categories,id',
            'is_active' => 'sometimes|boolean', 'sizes' => 'nullable|array|max:20', 'sizes.*' => 'string|max:10',
            'images' => 'nullable|array|max:8', 'images.*' => 'image|max:4096', 'order' => 'nullable|array', 'order.*' => 'string',
        ]);
        $existing = $p ? ($p->images ?: ($p->photo ? [$p->photo] : [])) : [];
        $files = $r->file('images', []);
        $order = $r->input('order', array_map(fn ($i) => 'new:' . $i, array_keys($files)));
        $final = [];
        foreach ($order as $o) {
            if (str_starts_with($o, 'new:')) {
                $f = $files[(int) substr($o, 4)] ?? null;
                if ($f) $final[] = $f->store('products', 'public');
            } elseif (in_array($o, $existing, true)) {
                $final[] = $o;
            }
        }
        abort_if(count($final) > 8, 422, 'Maximum 8 photos per product.');
        foreach (array_diff($existing, $final) as $gone) Storage::disk('public')->delete($gone);
        unset($d['order']);
        $d['images'] = $final;
        $d['photo'] = null;
        $d['discount_percent'] = (int) ($d['discount_percent'] ?? 0);
        $d['sizes'] = array_values($r->input('sizes', []));
        return $d;
    }

    // Public catalogue (active products of every store)
    public function index(Request $r)
    {
        return Product::with('category:id,name', 'store:id,name,logo')->where('is_active', true)->whereNotNull('store_id')
            ->when($r->query('store_id'), fn ($q, $id) => $q->where('store_id', $id))->latest()->get();
    }

    public function mine(Request $r)   // my own products, including hidden ones
    {
        return Product::with('category:id,name')->where('store_id', $this->myStore($r)->id)->latest()->get();
    }

    public function brands()
    {
        return Product::where('is_active', true)->whereNotNull('brand')->where('brand', '!=', '')->distinct()->orderBy('brand')->pluck('brand');
    }

    public function store(Request $r)
    {
        $s = $this->myStore($r);
        return response()->json(Product::create($this->data($r, null) + ['store_id' => $s->id]), 201);
    }

    public function update(Request $r, $id)   // sent as POST because PHP cannot read file uploads sent with PATCH
    {
        $p = Product::where('store_id', $this->myStore($r)->id)->findOrFail($id);
        $p->update($this->data($r, $p));
        return $p;
    }

    public function destroy(Request $r, $id)
    {
        $p = Product::where('store_id', $this->myStore($r)->id)->findOrFail($id);
        foreach ($p->images ?: ($p->photo ? [$p->photo] : []) as $img) Storage::disk('public')->delete($img);
        $p->delete();
        return ['ok' => true];
    }
}