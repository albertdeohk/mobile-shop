<?php
// Everything here is set in your .env file (see the notes in the chat).
return [
    'wa' => [
        'driver' => env('WA_DRIVER', 'log'),      // log = only write to storage/logs/laravel.log, fonnte = really send
        'token'  => env('WA_TOKEN'),
        'owner'  => env('WA_OWNER'),              // your number, international format without +, e.g. 6281234567890
    ],
    'bank' => [
        'name'   => env('SHOP_BANK_NAME', 'BCA'),
        'number' => env('SHOP_BANK_NUMBER', '0000000000'),
        'holder' => env('SHOP_BANK_HOLDER', 'Your Name'),
        'logo'   => env('SHOP_BANK_LOGO'),        // file inside public/, e.g. banks/bca.png
    ],
    'qris' => env('SHOP_QRIS_IMAGE'),             // optional static QRIS image inside public/, e.g. qris.png
];