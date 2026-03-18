import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("PAYSTACK_WEBHOOK_SECRET not configured");
      return new Response("Server error", { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    // Validate webhook signature
    const hash = createHmac("sha512", webhookSecret).update(body).digest("hex");
    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const txn = event.data;
    const reference = txn.reference;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for duplicate — idempotency
    const { data: existing } = await adminClient
      .from("payments")
      .select("id, status")
      .eq("reference", reference)
      .single();

    if (existing?.status === "success") {
      console.log("Duplicate webhook for reference:", reference);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (existing) {
      // Update existing pending payment
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
          },
        })
        .eq("reference", reference);
    } else {
      // Create new payment record (webhook arrived before initialize response)
      await adminClient.from("payments").insert({
        user_id: txn.metadata?.user_id || null,
        email: txn.customer?.email || "unknown@webhook.com",
        amount: Math.round(txn.amount / 100),
        currency: txn.currency || "KES",
        reference,
        status: "success",
        payment_method: txn.channel || "paystack",
        paystack_transaction_id: String(txn.id),
        order_id: txn.metadata?.order_id || null,
        metadata: {
          gateway_response: txn.gateway_response,
          paid_at: txn.paid_at,
          channel: txn.channel,
          source: "webhook",
        },
      });
    }

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

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
