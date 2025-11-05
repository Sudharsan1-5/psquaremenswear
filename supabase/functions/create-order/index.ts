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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    
    // ------------------------------------------------------------------
    // FIX 1: Hardcode the public Key ID (safe to hardcode public info)
    // REPLACE THIS: "rzp_test_RbWWBLSRtEtaMW" with YOUR actual public Key ID
    // ------------------------------------------------------------------
    const RAZORPAY_KEY_ID = "rzp_test_RbWWBLSRtEtaMW"; 
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment not configured");
    }
    
    // FIX 2: Only check for the SECRET key, preventing function crash
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay secret key not configured");
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
    
    // Apply coupon discount if available
    const coupon = body?.coupon;
    const discount = coupon ? (subtotal * (coupon.discount_percentage / 100)) : 0;
    const subtotalAfterDiscount = subtotal - discount;
    const totalWithTax = subtotalAfterDiscount * 1.18; // 18% tax
    const amount_paise = Math.round(totalWithTax * 100);

    // Insert order in DB (created)
    // Prepare order data with coupon information
    const orderData: any = {
      user_id: user.id,
      amount_paise,
      currency: "INR",
      items,
      order_details: orderDetails,
      status: "created",
    };

    // Add coupon information if available
    if (coupon) {
      orderData.coupon_id = coupon.id;
      orderData.coupon_code = coupon.code;
      orderData.discount_percentage = coupon.discount_percentage;
      orderData.discount_amount = discount;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("orders")
      .insert(orderData)
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
    // This line now correctly uses both the defined ID and the SECRET from Deno.env
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
        // FIX 3: Key ID is correctly returned to the frontend
        keyId: RAZORPAY_KEY_ID, 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
} catch (e) {
  console.error("create-order function error", e);
  const errorMessage = e instanceof Error ? e.message : String(e);
  const errorStack = e instanceof Error ? e.stack : undefined;
  
  return new Response(
    JSON.stringify({ 
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    }), 
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
  }
});