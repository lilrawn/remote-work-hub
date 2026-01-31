import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MPesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const callback: MPesaCallbackBody = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(callback, null, 2));

    const { stkCallback } = callback.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceiptNumber = '';
      
      if (CallbackMetadata?.Item) {
        const receiptItem = CallbackMetadata.Item.find(
          item => item.Name === 'MpesaReceiptNumber'
        );
        if (receiptItem) {
          mpesaReceiptNumber = String(receiptItem.Value);
        }
      }

      console.log('Payment successful:', { CheckoutRequestID, mpesaReceiptNumber });

      const { error } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'completed',
          mpesa_receipt_number: mpesaReceiptNumber,
        })
        .eq('mpesa_checkout_request_id', CheckoutRequestID);

      if (error) {
        console.error('Error updating order:', error);
      }
    } else {
      // Payment failed
      console.log('Payment failed:', { CheckoutRequestID, ResultCode, ResultDesc });

      const { error } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'failed',
        })
        .eq('mpesa_checkout_request_id', CheckoutRequestID);

      if (error) {
        console.error('Error updating order:', error);
      }
    }

    // M-Pesa expects a success response
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Callback received successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error processing callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
