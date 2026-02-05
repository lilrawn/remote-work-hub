import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  { id: 'technical', label: '🔧 Technical Support' },
  { id: 'account', label: '👤 Account Issues' },
  { id: 'other', label: '📝 Other' },
];

const userStates: Record<number, { category?: string; awaitingMessage?: boolean }> = {};

async function sendMessage(chatId: number | string, text: string, replyMarkup?: unknown) {
  const payload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup);
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
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
      const { chat, from, text, reply_to_message, message_id } = update.message;
      const chatId = chat.id;
      const firstName = from.first_name || 'User';

      // Check if this is an admin reply to a forwarded ticket
      if (ADMIN_CHAT_ID && String(chatId) === ADMIN_CHAT_ID && reply_to_message && text) {
        console.log('Admin reply detected, looking for ticket...');
        
        // Find the ticket by admin_message_id
        const { data: ticket, error } = await supabase
          .from('telegram_support_tickets')
          .select('*')
          .eq('admin_message_id', reply_to_message.message_id)
          .single();

        if (ticket && !error) {
          console.log('Found ticket:', ticket.id);
          
          // Send reply to user
          await sendMessage(
            ticket.telegram_chat_id,
            `💬 <b>Support Reply</b>\n\n${text}\n\n<i>Reply to this message for follow-up questions.</i>`
          );

          // Update ticket with admin reply
          await supabase
            .from('telegram_support_tickets')
            .update({ 
              admin_reply: text, 
              status: 'replied',
              updated_at: new Date().toISOString()
            })
            .eq('id', ticket.id);

          await sendMessage(chatId, '✅ Reply sent to user.');
        } else {
          console.log('Ticket not found for message_id:', reply_to_message.message_id);
          await sendMessage(chatId, '⚠️ Could not find the original ticket. The user may have started a new conversation.');
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle /start or /help command
      if (text === '/start' || text === '/help') {
        userStates[chatId] = {};
        const keyboard = {
          inline_keyboard: CATEGORIES.map(c => [{ text: c.label, callback_data: `category_${c.id}` }]),
        };
        await sendMessage(chatId, `👋 <b>Welcome ${firstName}!</b>\n\nSelect your support category:`, keyboard);
      } 
      // Handle user support message
      else if (text && userStates[chatId]?.awaitingMessage) {
        const state = userStates[chatId];
        const label = CATEGORIES.find(c => c.id === state.category)?.label || state.category;
        const username = from.username ? `@${from.username}` : 'No username';
        
        // Store ticket in database
        const { data: ticket, error: insertError } = await supabase
          .from('telegram_support_tickets')
          .insert({
            telegram_user_id: from.id,
            telegram_chat_id: chatId,
            telegram_username: from.username || null,
            telegram_first_name: firstName,
            category: state.category,
            message: text,
            status: 'open'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting ticket:', insertError);
        } else {
          console.log('Ticket created:', ticket.id);
        }

        // Forward to admin with ticket reference
        if (ADMIN_CHAT_ID) {
          const adminMessage = await sendMessage(ADMIN_CHAT_ID, 
            `🆕 <b>SUPPORT TICKET #${ticket?.id?.slice(0, 8) || 'N/A'}</b>\n\n` +
            `👤 ${firstName} (${username})\n` +
            `🆔 <code>${from.id}</code>\n` +
            `📋 ${label}\n\n` +
            `💬 ${text}\n\n` +
            `<i>↩️ Reply to this message to respond to the user</i>`
          );

          // Store the admin message ID for reply tracking
          if (ticket && adminMessage?.result?.message_id) {
            await supabase
              .from('telegram_support_tickets')
              .update({ admin_message_id: adminMessage.result.message_id })
              .eq('id', ticket.id);
          }
        }

        await sendMessage(chatId, 
          `✅ <b>Ticket Created!</b>\n\n` +
          `📋 Category: ${label}\n` +
          `🎫 Ticket ID: <code>${ticket?.id?.slice(0, 8) || 'N/A'}</code>\n\n` +
          `Our team will respond soon. Use /start for a new request.`
        );
        delete userStates[chatId];
      } 
      // User sent message without selecting category
      else if (text) {
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
