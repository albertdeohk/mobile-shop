<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    protected $guarded = [];
    protected $appends = ['logo_url', 'qris_url'];

    public static function of($user): ?self
    {
        return static::where('user_id', $user->id)->first();
    }

    public function reviews() { return $this->hasMany(Review::class); }
    public function products() { return $this->hasMany(Product::class); }

    public function getLogoUrlAttribute(): ?string { return $this->logo ? asset('storage/' . $this->logo) : null; }
    public function getQrisUrlAttribute(): ?string { return $this->qris ? asset('storage/' . $this->qris) : null; }
}