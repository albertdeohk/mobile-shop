<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $guarded = [];
    protected $casts = ['is_active' => 'boolean', 'expires_at' => 'date'];

    public static function valid(string $code, float $subtotal, ?int $storeId = null): self
    {
        $c = static::where('code', strtoupper(trim($code)))->where('store_id', $storeId)->first();
        abort_if(!$c || !$c->is_active, 422, 'This coupon code is not valid.');
        abort_if($c->expires_at && now()->gt($c->expires_at->copy()->endOfDay()), 422, 'This coupon has expired.');
        abort_if($c->max_uses !== null && $c->used >= $c->max_uses, 422, 'This coupon has been fully used.');
        abort_if($subtotal < $c->min_spend, 422, 'Minimum spend for this coupon is Rp ' . number_format($c->min_spend, 0, ',', '.') . '.');
        return $c;
    }

    public function discountFor(float $subtotal): float
    {
        $d = $this->type === 'percent' ? $subtotal * $this->value / 100 : (float) $this->value;
        return round(min($d, $subtotal));
    }

    public function label(): string
    {
        return $this->type === 'percent' ? rtrim(rtrim(number_format((float) $this->value, 2, '.', ''), '0'), '.') . '% off' : 'Rp ' . number_format($this->value, 0, ',', '.') . ' off';
    }
}