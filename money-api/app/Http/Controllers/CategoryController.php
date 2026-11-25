<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    private function admin(Request $r): void
    {
        abort_unless($r->user()->role === 'admin', 403, 'Admins only.');
    }

    public function index()
    {
        return Category::orderBy('name')->get(['id', 'name']);
    }

    public function store(Request $r)
    {
        $this->admin($r);
        $d = $r->validate(['name' => 'required|string|max:40|unique:categories,name']);
        return response()->json(Category::create($d), 201);
    }

    public function destroy(Request $r, $id)
    {
        $this->admin($r);
        Product::where('category_id', $id)->update(['category_id' => null]);
        Category::findOrFail($id)->delete();
        return ['ok' => true];
    }
}