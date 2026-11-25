<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsApp
{
    // Never throws: an order must still be saved even if WhatsApp is down. $to = the seller's number.
    public static function send(string $message, ?string $to = null): void
    {
        $c = config('shop.wa');
        $to = $to ?: $c['owner'];
        try {
            if ($c['driver'] === 'fonnte' && $c['token'] && $to) {
                Http::withHeaders(['Authorization' => $c['token']])->asForm()->timeout(10)
                    ->post('https://api.fonnte.com/send', ['target' => $to, 'message' => $message]);
            } else {
                Log::info("WhatsApp (not sent, log driver) to {$to}:\n" . $message);
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp failed: ' . $e->getMessage());
        }
    }
}