<?php
namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    private function mine(Request $r, $id): Conversation
    {
        $c = Conversation::findOrFail($id);
        $owner = Store::find($c->store_id)?->user_id;
        abort_unless($c->buyer_id === $r->user()->id || $owner === $r->user()->id, 403, 'Bukan percakapanmu.');
        return $c;
    }

    public function index(Request $r)
    {
        $me = $r->user()->id;
        $myStore = Store::of($r->user());
        return Conversation::where('buyer_id', $me)->when($myStore, fn ($q) => $q->orWhere('store_id', $myStore->id))
            ->orderByDesc('last_message_at')->get()->map(function ($c) use ($me, $myStore) {
                $store = Store::find($c->store_id);
                $asSeller = $myStore && $c->store_id === $myStore->id;
                $last = Message::where('conversation_id', $c->id)->latest('id')->first();
                return ['id' => $c->id, 'as' => $asSeller ? 'seller' : 'buyer',
                    'title' => $asSeller ? User::find($c->buyer_id)?->name : $store->name,
                    'logo_url' => $asSeller ? null : $store->logo_url,
                    'last' => $last?->body, 'last_at' => $c->last_message_at,
                    'unread' => Message::where('conversation_id', $c->id)->where('sender_id', '!=', $me)->whereNull('read_at')->count()];
            });
    }

    public function start(Request $r)
    {
        $d = $r->validate(['store_id' => 'required|exists:stores,id']);
        abort_if(Store::find($d['store_id'])->user_id === $r->user()->id, 422, 'Kamu tidak bisa chat dengan tokomu sendiri.');
        return Conversation::firstOrCreate(['buyer_id' => $r->user()->id, 'store_id' => $d['store_id']]);
    }

    public function messages(Request $r, $id)
    {
        $c = $this->mine($r, $id);
        Message::where('conversation_id', $c->id)->where('sender_id', '!=', $r->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        return Message::where('conversation_id', $c->id)->where('id', '>', (int) $r->query('after', 0))->orderBy('id')->limit(200)->get();
    }

    public function send(Request $r, $id)
    {
        $c = $this->mine($r, $id);
        $d = $r->validate(['body' => 'required|string|max:1000']);
        $m = Message::create(['conversation_id' => $c->id, 'sender_id' => $r->user()->id, 'body' => $d['body']]);
        $c->update(['last_message_at' => now()]);
        return $m;
    }
}