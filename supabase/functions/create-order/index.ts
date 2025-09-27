import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment not configured");
    }
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay secrets not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const orderDetails = body?.orderDetails ?? null;

    if (!items.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute amount in paise (INR)
    const subtotal = items.reduce((sum: number, it: any) => {
      const price = Number(it?.price) || 0;
      const qty = Number(it?.quantity) || 0;
      return sum + price * qty;
    }, 0);
    const totalWithTax = subtotal * 1.18; // 18% tax
    const amount_paise = Math.round(totalWithTax * 100);

    // Insert order in DB (created)
    const { data: inserted, error: insertErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        amount_paise,
        currency: "INR",
        items,
        order_details: orderDetails,
        status: "created",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("DB insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Razorpay order
    const authHeader = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount_paise,
        currency: "INR",
        receipt: inserted.id,
        payment_capture: 1,
        notes: { user_id: user.id },
      }),
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error("Razorpay order error", rzpData);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order", details: rzpData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update DB with razorpay_order_id
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ razorpay_order_id: rzpData.id })
      .eq("id", inserted.id);

    if (updateErr) {
      console.error("DB update error", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: inserted.id,
        razorpayOrderId: rzpData.id,
        amount: amount_paise,
        currency: "INR",
        keyId: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-order function error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});