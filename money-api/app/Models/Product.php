<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $guarded = [];
    protected $casts = ['is_active' => 'boolean', 'images' => 'array', 'sizes' => 'array'];
    protected $appends = ['image_urls', 'photo_url', 'final_price'];

    public function category() { return $this->belongsTo(Category::class); }
    public function store() { return $this->belongsTo(Store::class); }

    public function getImageUrlsAttribute(): array
    {
        $paths = $this->images ?: ($this->photo ? [$this->photo] : []);   // old single-photo products still work
        return array_map(fn ($p) => asset('storage/' . $p), $paths);
    }

    // price the customer really pays (after the product discount)
    public function getFinalPriceAttribute(): float
    {
        $d = (int) $this->discount_percent;
        return $d > 0 ? round($this->price * (100 - $d) / 100) : (float) $this->price;
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->image_urls[0] ?? null;                            // cover = first photo
    }
}