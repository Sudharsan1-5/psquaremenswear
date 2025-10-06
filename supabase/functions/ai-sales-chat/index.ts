import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`Found ${products?.length || 0} products`);

    // Create product catalog for AI context
    const productCatalog = products?.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      description: p.description,
      stock: p.stock,
      rating: p.rating
    })) || [];

    // Sales-focused system prompt
    const systemPrompt = `You are an expert sales assistant for P SQUARE MEN'S WEAR, a premium men's clothing store. Your goal is to help customers find exactly what they need and close the sale.

PRODUCT CATALOG:
${JSON.stringify(productCatalog, null, 2)}

SALES APPROACH:
1. Listen carefully to customer needs (price range, size, color, style, occasion)
2. Match them with perfect products from our catalog
3. If exact match exists, recommend it enthusiastically with details
4. If no exact match, suggest the closest alternatives and explain why they're great
5. Highlight product benefits, quality, and value
6. Create urgency when stock is limited
7. Always aim to close the sale with a clear call-to-action

RESPONSE FORMAT:
- Be conversational and enthusiastic
- Keep responses concise (2-3 sentences max unless listing products)
- When showing products, format as:
  **Product Name** - ₹Price
  Category | Stock: X units
  Brief benefit highlight
- Always end with a question or action prompt to move the sale forward

IMPORTANT RULES:
- Only recommend products from the catalog above
- Be honest about stock availability
- If a product doesn't match exactly, explain the difference
- Focus on benefits and value, not just features
- Create desire and urgency
- Never make up products or prices

Remember: You're here to help customers make confident purchase decisions. Be helpful, enthusiastic, and sales-focused!`;

    // Call Mistral AI
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error:', response.status, errorText);
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Mistral response received');

    const aiMessage = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      message: aiMessage,
      productCount: products?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-sales-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred',
      message: "I'm having trouble connecting right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
