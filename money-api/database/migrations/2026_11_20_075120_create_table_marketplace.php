<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();   // one store per user
            $t->string('name', 60);
            $t->string('description', 300)->nullable();
            $t->string('logo')->nullable();
            $t->string('whatsapp', 20)->nullable();
            $t->string('bank_name', 30)->nullable();
            $t->string('bank_number', 30)->nullable();
            $t->string('bank_holder', 60)->nullable();
            $t->string('qris')->nullable();
            $t->timestamps();
        });
        Schema::table('products', function (Blueprint $t) {
            $t->unsignedBigInteger('store_id')->nullable()->index();
            $t->string('brand', 40)->nullable()->index();
        });
        Schema::table('coupons', fn (Blueprint $t) => $t->unsignedBigInteger('store_id')->nullable()->index());
        Schema::table('orders', fn (Blueprint $t) => $t->unsignedBigInteger('store_id')->nullable()->index());
        Schema::create('reviews', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('order_id')->unique();    // one review per order
            $t->unsignedBigInteger('store_id')->index();
            $t->unsignedBigInteger('user_id');
            $t->unsignedTinyInteger('rating');
            $t->string('comment', 300)->nullable();
            $t->timestamps();
        });
        Schema::create('conversations', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('buyer_id');
            $t->unsignedBigInteger('store_id');
            $t->timestamp('last_message_at')->nullable();
            $t->timestamps();
            $t->unique(['buyer_id', 'store_id']);
        });
        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('conversation_id')->index();
            $t->unsignedBigInteger('sender_id');
            $t->text('body');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('reviews');
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn('store_id'));
        Schema::table('coupons', fn (Blueprint $t) => $t->dropColumn('store_id'));
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn(['store_id', 'brand']));
        Schema::dropIfExists('stores');
    }
};