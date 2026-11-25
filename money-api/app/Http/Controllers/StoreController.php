<?php
namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    private function card(Store $s): array
    {
        $n = (int) $s->reviews_count; $avg = (float) ($s->reviews_avg_rating ?? 0);
        return ['id' => $s->id, 'name' => $s->name, 'description' => $s->description, 'logo_url' => $s->logo_url,
            'rating' => round($avg, 1), 'reviews' => $n,
            'score' => ($avg * $n + 4 * 5) / ($n + 5)];   // a few reviews cannot beat many good ones: start from a 4.0 average worth 5 votes
    }

    // Recommended sellers, best rating first.
    public function index()
    {
        return Store::withCount('reviews')->withAvg('reviews', 'rating')
            ->whereHas('products', fn ($q) => $q->where('is_active', true))->get()
            ->map(fn ($s) => $this->card($s))->sortByDesc('score')->values()->take(20);
    }

    public function show($id)
    {
        $s = Store::withCount('reviews')->withAvg('reviews', 'rating')->findOrFail($id);
        $reviews = DB::table('reviews')->join('users', 'users.id', '=', 'reviews.user_id')->where('reviews.store_id', $id)
            ->orderByDesc('reviews.id')->limit(20)->get(['reviews.rating', 'reviews.comment', 'reviews.created_at', 'users.name']);
        return $this->card($s) + ['review_list' => $reviews];
    }

    public function mine(Request $r)
    {
        return response()->json(Store::of($r->user()));
    }

    public function save(Request $r)   // create or update my store (multipart, so logo and QRIS can be uploaded)
    {
        $d = $r->validate(['name' => 'required|string|max:60', 'description' => 'nullable|string|max:300', 'whatsapp' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:30', 'bank_number' => 'nullable|string|max:30', 'bank_holder' => 'nullable|string|max:60',
            'logo' => 'nullable|image|max:4096', 'qris' => 'nullable|image|max:4096']);
        $s = Store::of($r->user()) ?? new Store(['user_id' => $r->user()->id]);
        unset($d['logo'], $d['qris']);
        if (!empty($d['whatsapp'])) {                      // 0812... -> 62812...
            $wa = preg_replace('/\D/', '', $d['whatsapp']);
            $d['whatsapp'] = str_starts_with($wa, '0') ? '62' . substr($wa, 1) : $wa;
        }
        foreach (['logo', 'qris'] as $f) {
            if ($r->hasFile($f)) {
                if ($s->$f) Storage::disk('public')->delete($s->$f);
                $d[$f] = $r->file($f)->store('stores', 'public');
            }
        }
        $s->fill($d)->save();
        return $s->fresh();
    }
}