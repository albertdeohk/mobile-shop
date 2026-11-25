<?php
namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    private function rules(): array
    {
        return ['kind' => 'required|in:in,out', 'amount' => 'required|numeric|min:0.01|max:9999999999999',
            'category' => 'required|string|max:40', 'note' => 'nullable|string|max:60', 'date' => 'required|date_format:Y-m-d'];
    }

    public function index(Request $r)
    {
        $r->validate(['month' => 'nullable|date_format:Y-m']);
        return Transaction::where('user_id', $r->user()->id)
            ->when($r->query('month'), fn ($q, $m) => $q->where('date', 'like', $m . '%'))
            ->orderByDesc('date')->orderByDesc('id')->get();
    }

    public function store(Request $r)
    {
        return response()->json(Transaction::create($r->validate($this->rules()) + ['user_id' => $r->user()->id]), 201);
    }

    public function update(Request $r, $id)
    {
        $t = Transaction::where('user_id', $r->user()->id)->findOrFail($id);
        $t->update($r->validate($this->rules()));
        return $t;
    }

    public function destroy(Request $r, $id)
    {
        Transaction::where('user_id', $r->user()->id)->findOrFail($id)->delete();
        return ['ok' => true];
    }
}
