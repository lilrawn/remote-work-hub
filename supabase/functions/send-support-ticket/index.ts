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

const CATEGORY_LABELS: Record<string, string> = {
  payments: '💳 Payments',
  technical: '🔧 Technical',
  account: '👤 Account',
  other: '📝 Other',
};

async function tgSend(chatId: number | string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text, 
      parse_mode: 'HTML' 
    }),
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    return new Response(JSON.stringify({ error: 'Telegram not configured' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get request body
    const { category, message, userName, userEmail } = await req.json();

    if (!category || !message) {
      return new Response(JSON.stringify({ error: 'Category and message required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Generate a consistent web chat ID based on user ID
    // Use negative numbers to distinguish from real Telegram chat IDs
    const userHash = user.id.replace(/-/g, '').slice(0, 10);
    const webChatId = -Math.abs(parseInt(userHash, 16) % 2147483647);
    const webUserId = Math.abs(parseInt(userHash.slice(0, 8), 16) % 2147483647);

    // Create ticket in database
    const { data: ticket, error: insertError } = await supabase
      .from('telegram_support_tickets')
      .insert({
        telegram_user_id: webUserId,
        telegram_chat_id: webChatId,
        telegram_username: userEmail?.split('@')[0] || null,
        telegram_first_name: userName || userEmail?.split('@')[0] || 'Web User',
        category: category,
        message: message.trim(),
        status: 'open',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Send notification to admin's Telegram
    const categoryLabel = CATEGORY_LABELS[category] || category;
    const telegramMsg = await tgSend(
      ADMIN_CHAT_ID,
      `🌐 <b>WEB TICKET</b>\n` +
      `👤 ${userName || 'Unknown'}\n` +
      `📧 ${userEmail || 'N/A'}\n` +
      `📋 ${categoryLabel}\n\n` +
      `💬 ${message}\n\n` +
      `<i>Reply to this message to respond (ID: ${ticket.id.slice(0, 8)})</i>`
    );

    // Store the admin message ID for reply tracking
    if (telegramMsg?.result?.message_id) {
      await supabase
        .from('telegram_support_tickets')
        .update({ admin_message_id: telegramMsg.result.message_id })
        .eq('id', ticket.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ticketId: ticket.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
