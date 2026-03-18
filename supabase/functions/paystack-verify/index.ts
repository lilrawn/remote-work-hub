import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference } = await req.json();
    if (!reference) {
      return new Response(
        JSON.stringify({ error: "Missing reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${paystackSecretKey}` },
      }
    );
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return new Response(
        JSON.stringify({
          success: false,
          status: verifyData.data?.status || "failed",
          message: verifyData.message || "Payment verification failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txn = verifyData.data;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update payment record
    await adminClient
      .from("payments")
      .update({
        status: "success",
        paystack_transaction_id: String(txn.id),
        payment_method: txn.channel || "paystack",
        metadata: {
          gateway_response: txn.gateway_response,
          paid_at: txn.paid_at,
          channel: txn.channel,
          ip_address: txn.ip_address,
          authorization: txn.authorization,
        },
      })
      .eq("reference", reference);

    // Update order status
    const orderId = txn.metadata?.order_id;
    if (orderId) {
      await adminClient
        .from("orders")
        .update({
          payment_status: "completed",
          mpesa_receipt_number: reference,
        })
        .eq("id", orderId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "success",
        amount: txn.amount / 100,
        currency: txn.currency,
        reference: txn.reference,
        channel: txn.channel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Paystack verify error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
