import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CATEGORIES = [
  { id: 'payments', label: '💳 Payments' },
  { id: 'technical', label: '🔧 Technical' },
  { id: 'account', label: '👤 Account' },
  { id: 'other', label: '📝 Other' },
];

const userStates: Record<number, { category?: string; awaiting?: boolean }> = {};

async function tgSend(chatId: number | string, text: string, keyboard?: unknown) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = JSON.stringify(keyboard);
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (url.pathname.endsWith('/setup-webhook')) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://zqscoubnjzyjmgefneoe.supabase.co/functions/v1/telegram-bot` }),
    });
    return new Response(JSON.stringify(await res.json()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'No token' }), { status: 500, headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('Update:', JSON.stringify(update));

    if (update.callback_query) {
      const { id, message, data } = update.callback_query;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: id }),
      });
      if (data.startsWith('category_')) {
        const cat = data.replace('category_', '');
        userStates[message.chat.id] = { category: cat, awaiting: true };
        await tgSend(message.chat.id, `📋 <b>${CATEGORIES.find(c => c.id === cat)?.label}</b>\n\nDescribe your issue:`);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (update.message) {
      const { chat, from, text, reply_to_message } = update.message;
      const chatId = chat.id;
      const name = from.first_name || 'User';
      const kb = { inline_keyboard: CATEGORIES.map(c => [{ text: c.label, callback_data: `category_${c.id}` }]) };

      // Admin reply
      if (ADMIN_CHAT_ID && String(chatId) === ADMIN_CHAT_ID && reply_to_message && text) {
        const { data: ticket } = await supabase
          .from('telegram_support_tickets')
          .select('*')
          .eq('admin_message_id', reply_to_message.message_id)
          .single();
        if (ticket) {
          await tgSend(ticket.telegram_chat_id, `💬 <b>Support Reply</b>\n\n${text}`);
          await supabase.from('telegram_support_tickets').update({ admin_reply: text, status: 'replied' }).eq('id', ticket.id);
          await tgSend(chatId, '✅ Reply sent.');
        } else {
          await tgSend(chatId, '⚠️ Ticket not found.');
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (text === '/start' || text === '/help') {
        userStates[chatId] = {};
        await tgSend(chatId, `👋 <b>Welcome ${name}!</b>\n\nSelect category:`, kb);
      } else if (text && userStates[chatId]?.awaiting) {
        const cat = userStates[chatId].category;
        const { data: ticket } = await supabase
          .from('telegram_support_tickets')
          .insert({ telegram_user_id: from.id, telegram_chat_id: chatId, telegram_username: from.username, telegram_first_name: name, category: cat, message: text })
          .select()
          .single();
        if (ADMIN_CHAT_ID && ticket) {
          const msg = await tgSend(ADMIN_CHAT_ID, `🆕 <b>TICKET</b>\n👤 ${name} (@${from.username || 'N/A'})\n📋 ${cat}\n💬 ${text}\n\n<i>Reply to respond</i>`);
          if (msg?.result?.message_id) {
            await supabase.from('telegram_support_tickets').update({ admin_message_id: msg.result.message_id }).eq('id', ticket.id);
          }
        }
        await tgSend(chatId, `✅ <b>Ticket created!</b>\nID: <code>${ticket?.id?.slice(0, 8)}</code>\n\nUse /start for new request.`);
        delete userStates[chatId];
      } else if (text) {
        await tgSend(chatId, 'Select a category first:', kb);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
