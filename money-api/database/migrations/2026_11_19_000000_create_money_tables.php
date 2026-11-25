<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('money_tx', function (Blueprint $t) {
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->uuid('id');
            $t->string('k', 3);
            $t->decimal('amt', 15, 2);
            $t->string('cat', 40);
            $t->string('note', 60)->nullable();
            $t->date('date');
            $t->unsignedBigInteger('u')->index();
            $t->boolean('d')->default(false);
            $t->primary(['user_id', 'id']);
        });
        Schema::table('users', function (Blueprint $t) {
            $t->json('budgets')->nullable();
            $t->unsignedBigInteger('budgets_u')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('money_tx');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['budgets', 'budgets_u']));
    }
};
