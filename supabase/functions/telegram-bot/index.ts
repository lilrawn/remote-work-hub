import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');

const CATEGORIES = [
  { id: 'payments', label: '💳 Payments' },
  { id: 'technical', label: '🔧 Technical Support' },
  { id: 'account', label: '👤 Account Issues' },
  { id: 'other', label: '📝 Other' },
];

const userStates: Record<number, { category?: string; awaitingMessage?: boolean }> = {};

async function sendMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  const payload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup);
  
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function answerCallback(id: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // Webhook setup endpoint
  if (url.pathname.endsWith('/setup-webhook')) {
    const webhookUrl = `https://zqscoubnjzyjmgefneoe.supabase.co/functions/v1/telegram-bot`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const result = await res.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Bot not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const update = await req.json();
    console.log('Update:', JSON.stringify(update));

    // Handle button clicks
    if (update.callback_query) {
      const { id, message, data } = update.callback_query;
      const chatId = message.chat.id;
      
      if (data.startsWith('category_')) {
        await answerCallback(id);
        const category = data.replace('category_', '');
        userStates[chatId] = { category, awaitingMessage: true };
        const label = CATEGORIES.find(c => c.id === category)?.label || category;
        await sendMessage(chatId, `📋 <b>Category:</b> ${label}\n\nPlease describe your issue:`);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle messages
    if (update.message) {
      const { chat, from, text } = update.message;
      const chatId = chat.id;
      const firstName = from.first_name || 'User';

      if (text === '/start' || text === '/help') {
        userStates[chatId] = {};
        const keyboard = {
          inline_keyboard: CATEGORIES.map(c => [{ text: c.label, callback_data: `category_${c.id}` }]),
        };
        await sendMessage(chatId, `👋 <b>Welcome ${firstName}!</b>\n\nSelect your support category:`, keyboard);
      } else if (text && userStates[chatId]?.awaitingMessage) {
        const state = userStates[chatId];
        const label = CATEGORIES.find(c => c.id === state.category)?.label || state.category;
        const username = from.username ? `@${from.username}` : 'No username';
        
        if (ADMIN_CHAT_ID) {
          await sendMessage(ADMIN_CHAT_ID, 
            `🆕 <b>SUPPORT REQUEST</b>\n\n👤 ${firstName} (${username})\n🆔 <code>${from.id}</code>\n📋 ${label}\n\n💬 ${text}`
          );
        }
        await sendMessage(chatId, `✅ <b>Received!</b>\n\nOur team will respond soon.\n\nUse /start for a new request.`);
        delete userStates[chatId];
      } else if (text) {
        const keyboard = {
          inline_keyboard: CATEGORIES.map(c => [{ text: c.label, callback_data: `category_${c.id}` }]),
        };
        await sendMessage(chatId, `Please select a category first:`, keyboard);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
