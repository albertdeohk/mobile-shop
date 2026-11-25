<?php
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'update']);

    // personal money in / out
    Route::apiResource('transactions', TransactionController::class)->except('show');
    Route::get('/budgets', [BudgetController::class, 'show']);
    Route::put('/budgets', [BudgetController::class, 'update']);

    // marketplace: browsing
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/brands', [ProductController::class, 'brands']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/stores', [StoreController::class, 'index']);          // recommended sellers, best rating first
    Route::get('/stores/{id}', [StoreController::class, 'show']);

    // marketplace: buying
    Route::post('/coupons/check', [CouponController::class, 'check']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:20,1');
    Route::post('/orders/{id}/review', [OrderController::class, 'review']);

    // marketplace: selling (every user can open one store)
    Route::get('/my-store', [StoreController::class, 'mine']);
    Route::post('/my-store', [StoreController::class, 'save']);
    Route::get('/my-products', [ProductController::class, 'mine']);
    Route::post('/my-products', [ProductController::class, 'store']);
    Route::post('/my-products/{id}', [ProductController::class, 'update']);
    Route::delete('/my-products/{id}', [ProductController::class, 'destroy']);
    Route::get('/my-coupons', [CouponController::class, 'index']);
    Route::post('/my-coupons', [CouponController::class, 'store']);
    Route::patch('/my-coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/my-coupons/{id}', [CouponController::class, 'destroy']);
    Route::get('/store-orders', [OrderController::class, 'sales']);
    Route::patch('/store-orders/{id}', [OrderController::class, 'update']);

    // chat
    Route::get('/conversations', [ChatController::class, 'index']);
    Route::post('/conversations', [ChatController::class, 'start']);
    Route::get('/conversations/{id}/messages', [ChatController::class, 'messages']);
    Route::post('/conversations/{id}/messages', [ChatController::class, 'send']);

    // platform admin only
    Route::prefix('admin')->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{id}', [AdminUserController::class, 'update']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    });
});