import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKPushRequest {
  phone: string;
  amount: number;
  orderId: string;
  accountReference: string;
  transactionDesc: string;
}

// =====================================================
// RATE LIMITING: In-memory store for rate limiting
// Key: phone number, Value: { count, firstRequestTime }
// =====================================================
const rateLimitStore = new Map<string, { count: number; firstRequestTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per minute per phone
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_GLOBAL_REQUESTS = 100; // Max 100 requests per minute globally

let globalRequestCount = 0;
let globalWindowStart = Date.now();

function checkRateLimit(phone: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  
  // Check global rate limit
  if (now - globalWindowStart > GLOBAL_RATE_LIMIT_WINDOW_MS) {
    globalRequestCount = 0;
    globalWindowStart = now;
  }
  
  if (globalRequestCount >= MAX_GLOBAL_REQUESTS) {
    const retryAfter = Math.ceil((GLOBAL_RATE_LIMIT_WINDOW_MS - (now - globalWindowStart)) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Check per-phone rate limit
  const phoneData = rateLimitStore.get(phone);
  
  if (!phoneData) {
    rateLimitStore.set(phone, { count: 1, firstRequestTime: now });
    globalRequestCount++;
    return { allowed: true };
  }
  
  // Reset window if expired
  if (now - phoneData.firstRequestTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(phone, { count: 1, firstRequestTime: now });
    globalRequestCount++;
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (phoneData.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - phoneData.firstRequestTime)) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment count
  phoneData.count++;
  globalRequestCount++;
  return { allowed: true };
}

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of rateLimitStore.entries()) {
    if (now - data.firstRequestTime > RATE_LIMIT_WINDOW_MS * 5) {
      rateLimitStore.delete(phone);
    }
  }
}, 5 * 60 * 1000);

async function getAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY')!;
  const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET')!;
  
  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get access token:', error);
    throw new Error('Failed to get M-Pesa access token');
  }
  
  const data = await response.json();
  return data.access_token;
}

function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${shortcode}${passkey}${timestamp}`);
  
  // Base64 encode
  return btoa(String.fromCharCode(...data));
}

// Validate phone number format
function isValidKenyanPhone(phone: string): boolean {
  // Must be 12 digits starting with 254
  return /^254[17]\d{8}$/.test(phone);
}

// Validate amount
function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= 150000;
}

// Validate order ID format (UUID)
function isValidOrderId(orderId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, amount, orderId, accountReference, transactionDesc }: STKPushRequest = await req.json();

    // Enhanced input validation
    if (!phone || !amount || !orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format
    if (!isValidKenyanPhone(phone)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order ID
    if (!isValidOrderId(orderId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid order reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // RATE LIMITING CHECK
    // =====================================================
    const rateLimit = checkRateLimit(phone);
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for phone: ${phone.slice(0, 6)}***`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many payment requests. Please try again later.',
          retryAfter: rateLimit.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter || 60)
          } 
        }
      );
    }

    console.log('STK Push request received:', { 
      phone: phone.slice(0, 6) + '***', // Don't log full phone
      amount, 
      orderId: orderId.slice(0, 8) + '***' 
    });

    // Get M-Pesa credentials
    const shortcode = Deno.env.get('MPESA_SHORTCODE') || '174379'; // Sandbox shortcode
    const passkey = Deno.env.get('MPESA_PASSKEY')!;
    
    // Get access token
    const accessToken = await getAccessToken();
    console.log('Access token obtained');

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);

    // Sanitize account reference and transaction description
    const safeAccountReference = (accountReference || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12);
    const safeTransactionDesc = (transactionDesc || 'Payment').replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 13);

    // Prepare STK Push request
    const stkPushPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      AccountReference: safeAccountReference,
      TransactionDesc: safeTransactionDesc,
    };

    console.log('Sending STK Push:', { 
      BusinessShortCode: shortcode,
      Amount: Math.round(amount),
      PhoneNumber: phone.slice(0, 6) + '***'
    });

    // Send STK Push request
    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPushPayload),
      }
    );

    const stkResult = await stkResponse.json();
    console.log('STK Push response code:', stkResult.ResponseCode);

    if (stkResult.ResponseCode === '0') {
      // Update order with checkout request ID
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabaseClient
        .from('orders')
        .update({ 
          mpesa_checkout_request_id: stkResult.CheckoutRequestID,
          payment_status: 'processing'
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK Push sent successfully',
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('STK Push failed with code:', stkResult.ResponseCode);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment request failed. Please try again.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error processing STK Push:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ success: false, error: 'Payment service temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
