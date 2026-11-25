<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    public function show(Request $r)
    {
        return (object) DB::table('budgets')->where('user_id', $r->user()->id)->pluck('amount', 'category')->map(fn ($v) => (float) $v)->all();
    }

    public function update(Request $r)
    {
        $d = $r->validate(['category' => 'required|string|max:40', 'amount' => 'required|numeric|min:0']);
        $key = ['user_id' => $r->user()->id, 'category' => $d['category']];
        $d['amount'] > 0 ? DB::table('budgets')->updateOrInsert($key, ['amount' => $d['amount']]) : DB::table('budgets')->where($key)->delete();
        return $this->show($r);
    }
}
