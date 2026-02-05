import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Telegram Bot Configuration
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory state for tracking user selections
const userStates = new Map<number, { category?: string; awaitingMessage?: boolean }>();

// Support categories
const CATEGORIES = [
  { id: 'payments', label: '💳 Payments' },
  { id: 'technical', label: '🔧 Technical Support' },
  { id: 'account', label: '👤 Account Issues' },
  { id: 'other', label: '📝 Other' },
];

// Send message to Telegram
async function sendMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  
  if (replyMarkup) {
    payload.reply_markup = JSON.stringify(replyMarkup);
  }
  
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  const result = await response.json();
  console.log('Send message result:', result);
  return result;
}

// Answer callback query (removes loading state on buttons)
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
}

// Handle /start command
async function handleStart(chatId: number, firstName: string) {
  // Reset user state
  userStates.set(chatId, {});
  
  const welcomeMessage = `
👋 <b>Welcome to Remote Work Hub Support, ${firstName}!</b>

We're here to help you with any questions or issues. Please select the type of support you need:
  `;
  
  const keyboard = {
    inline_keyboard: CATEGORIES.map(cat => ([{
      text: cat.label,
      callback_data: `category_${cat.id}`,
    }])),
  };
  
  await sendMessage(chatId, welcomeMessage, keyboard);
}

// Handle category selection
async function handleCategorySelection(chatId: number, callbackQueryId: string, category: string) {
  await answerCallbackQuery(callbackQueryId, 'Category selected');
  
  // Store the selected category
  userStates.set(chatId, { category, awaitingMessage: true });
  
  const categoryLabel = CATEGORIES.find(c => c.id === category)?.label || category;
  
  const message = `
📋 <b>Category:</b> ${categoryLabel}

Please describe your issue or question in detail. Type your message below and I'll forward it to our support team:
  `;
  
  await sendMessage(chatId, message);
}

// Handle user message (support request)
async function handleSupportMessage(chatId: number, userId: number, username: string | undefined, firstName: string, lastName: string | undefined, messageText: string) {
  const userState = userStates.get(chatId);
  
  if (!userState?.awaitingMessage || !userState.category) {
    // User hasn't selected a category yet, show the menu
    await handleStart(chatId, firstName);
    return;
  }
  
  const categoryLabel = CATEGORIES.find(c => c.id === userState.category)?.label || userState.category;
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const usernameDisplay = username ? `@${username}` : 'No username';
  
  // Format the message for admin
  const adminMessage = `
🆕 <b>NEW SUPPORT REQUEST</b>

👤 <b>User:</b> ${fullName}
🔗 <b>Username:</b> ${usernameDisplay}
🆔 <b>Telegram ID:</b> <code>${userId}</code>

📋 <b>Category:</b> ${categoryLabel}

💬 <b>Message:</b>
${messageText}

━━━━━━━━━━━━━━━━━━
<i>Reply to this message to respond to the user</i>
  `;
  
  // Forward to admin
  if (ADMIN_CHAT_ID) {
    await sendMessage(ADMIN_CHAT_ID, adminMessage);
  }
  
  // Confirm to user
  const confirmMessage = `
✅ <b>Request Received!</b>

Thank you for contacting Remote Work Hub Support. We've received your message and our team will respond shortly.

📋 <b>Category:</b> ${categoryLabel}
📧 <b>Your message:</b> ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}

Need to send another request? Use /start to begin again.
  `;
  
  await sendMessage(chatId, confirmMessage);
  
  // Reset user state
  userStates.delete(chatId);
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  
  // Setup webhook endpoint
  if (url.pathname.endsWith('/setup-webhook') && req.method === 'GET') {
    try {
      const webhookUrl = `https://zqscoubnjzyjmgefneoe.supabase.co/functions/v1/telegram-bot`;
      const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const result = await response.json();
      console.log('Webhook setup result:', result);
      return new Response(JSON.stringify({ 
        success: result.ok, 
        message: result.ok ? 'Webhook set successfully' : result.description,
        webhook_url: webhookUrl 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Webhook setup error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  try {
    // Verify bot token is configured
    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Bot not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const update = await req.json();
    console.log('Received update:', JSON.stringify(update));
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id, from, message, data } = update.callback_query;
      const chatId = message.chat.id;
      
      if (data.startsWith('category_')) {
        const category = data.replace('category_', '');
        await handleCategorySelection(chatId, id, category);
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
      const lastName = from.last_name;
      const username = from.username;
      
      // Handle /start command
      if (text === '/start') {
        await handleStart(chatId, firstName);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Handle /help command
      if (text === '/help') {
        const helpMessage = `
🆘 <b>How to use Remote Work Hub Support Bot</b>

1️⃣ Use /start to begin a new support request
2️⃣ Select the category that best describes your issue
3️⃣ Type your message with as much detail as possible
4️⃣ Our support team will respond as soon as possible

<b>Available Commands:</b>
/start - Start a new support request
/help - Show this help message
        `;
        await sendMessage(chatId, helpMessage);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Handle regular messages (support requests)
      if (text) {
        await handleSupportMessage(chatId, from.id, username, firstName, lastName, text);
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing update:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
