<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->string('name', 80);
            $t->text('description')->nullable();
            $t->decimal('price', 15, 2);
            $t->string('photo')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->decimal('total', 15, 2);
            $t->string('status', 12)->default('pending');   // pending | paid | shipped | done | cancelled
            $t->string('customer_name', 80);
            $t->string('phone', 20);
            $t->text('address');
            $t->string('note', 200)->nullable();
            $t->timestamps();
        });
        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('product_id')->nullable();
            $t->string('name', 80);                          // name and price are copied, so old orders never change
            $t->decimal('price', 15, 2);
            $t->unsignedSmallInteger('qty');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('products');
    }
};