<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name', 40)->unique();
            $t->timestamps();
        });
        Schema::table('products', function (Blueprint $t) {
            $t->unsignedBigInteger('category_id')->nullable()->index();
            $t->json('images')->nullable();   // list of photo paths, the first one is the cover
            $t->json('sizes')->nullable();    // e.g. ["S","M","L"]
        });
        Schema::create('coupons', function (Blueprint $t) {
            $t->id();
            $t->string('code', 30)->unique();
            $t->string('type', 8);                                   // percent | fixed
            $t->decimal('value', 15, 2);
            $t->decimal('min_spend', 15, 2)->default(0);
            $t->unsignedInteger('max_uses')->nullable();
            $t->unsignedInteger('used')->default(0);
            $t->date('expires_at')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::table('orders', function (Blueprint $t) {
            $t->decimal('subtotal', 15, 2)->default(0);
            $t->decimal('discount', 15, 2)->default(0);
            $t->string('coupon_code', 30)->nullable();
        });
        Schema::table('order_items', function (Blueprint $t) {
            $t->string('size', 10)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $t) => $t->dropColumn('size'));
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['subtotal', 'discount', 'coupon_code']));
        Schema::dropIfExists('coupons');
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn(['category_id', 'images', 'sizes']));
        Schema::dropIfExists('categories');
    }
};