<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $t) {
                $t->string('role', 10)->default('user');
                $t->boolean('is_active')->default(true);
            });
        }
        if (!Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->string('kind', 3);
                $t->decimal('amount', 15, 2);
                $t->string('category', 40);
                $t->string('note', 60)->nullable();
                $t->date('date');
                $t->timestamps();
                $t->index(['user_id', 'date']);
            });
        }
        if (!Schema::hasTable('budgets')) {
            Schema::create('budgets', function (Blueprint $t) {
                $t->foreignId('user_id')->constrained()->cascadeOnDelete();
                $t->string('category', 40);
                $t->decimal('amount', 15, 2);
                $t->primary(['user_id', 'category']);
            });
        }
    }

    public function down(): void {}
};