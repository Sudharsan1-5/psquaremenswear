import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intelligent suggestion generator based on conversation context
function generateContextualSuggestions(userMessage: string, products: any[]): string[] {
  const msg = userMessage.toLowerCase();
  
  // Extract context clues
  const mentionedPrice = msg.match(/₹?\s?(\d+)/);
  const priceLimit = mentionedPrice ? parseInt(mentionedPrice[1]) : null;
  
  // Category suggestions based on what user asked
  if (msg.includes('formal') || msg.includes('shirt')) {
    return [
      "Show me formal pants to match",
      "What accessories go with this?",
      "Any similar styles in different colors?",
      "Tell me about fabric quality"
    ];
  }
  
  if (msg.includes('casual') || msg.includes('t-shirt') || msg.includes('tshirt')) {
    return [
      "Show me casual pants",
      "What's trending in casual wear?",
      "Show me jackets for layering",
      "Any combo deals available?"
    ];
  }
  
  if (msg.includes('sale') || msg.includes('discount') || msg.includes('offer')) {
    return [
      "What are today's best deals?",
      "Show me clearance items",
      "Any buy-one-get-one offers?",
      "Show me products under ₹500"
    ];
  }
  
  if (priceLimit) {
    return [
      `Show me bestsellers under ₹${priceLimit}`,
      "What's the best value for money?",
      "Any combo offers in this range?",
      "Show me premium alternatives"
    ];
  }
  
  // Check what categories are available
  const categories = [...new Set(products.map(p => p.category))];
  const suggestions: string[] = [];
  
  if (categories.length > 0) {
    suggestions.push(`Show me ${categories[0]} collection`);
    if (categories[1]) suggestions.push(`What about ${categories[1]}?`);
  }
  
  suggestions.push("What's new this week?");
  suggestions.push("Show me complete outfits");
  
  return suggestions.slice(0, 4);
}

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

    // Enhanced sales-focused system prompt
    const systemPrompt = `You are Ravi, an expert sales consultant at P SQUARE MEN'S WEAR - a premium men's clothing store. You're knowledgeable, enthusiastic, and great at understanding customer needs.

PRODUCT CATALOG:
${JSON.stringify(productCatalog, null, 2)}

YOUR SALES PERSONALITY:
- Friendly and conversational, like chatting with a trusted friend
- Enthusiastic about helping customers find their perfect match
- Honest about product availability and alternatives
- Create desire by highlighting benefits, not just features
- Build urgency when appropriate (limited stock, trending items)
- Always guide toward the next step in the buying journey

SALES APPROACH:
1. UNDERSTAND: Ask clarifying questions if needed (budget, occasion, style preference)
2. MATCH: Find products that perfectly fit their needs from the catalog
3. PRESENT: Show products enthusiastically with key selling points
4. GUIDE: Suggest complementary items or alternatives
5. CLOSE: Always end with a clear action - "Check it out", "Add to cart", "Let me show you more"

RESPONSE FORMAT:
- Be conversational and natural
- Keep responses concise (2-4 sentences for general chat, bullet points for product listings)
- DO NOT use markdown symbols like *, **, #, ##
- Write in plain text - frontend handles formatting
- When listing products, format as:
  Product Name - ₹Price
  Category | In Stock: X units
  Why it's perfect: [key benefit]
- Use emojis sparingly for impact 🎯 ✨ 🔥
- Always end with an engaging question or action prompt

PRODUCT PRESENTATION TIPS:
- Highlight value: "Premium quality at just ₹X"
- Create urgency: "Only X left in stock!"
- Social proof: "Top seller this month"
- Benefits over features: "Perfect for office meetings" not just "formal shirt"
- Suggest combos: "Pairs perfectly with..."

HANDLING SITUATIONS:
- No exact match: Suggest closest alternatives and explain why they're great
- Out of stock: Show similar items, offer to notify when back
- Price concerns: Show value proposition, suggest alternatives in budget
- Indecision: Ask clarifying questions, narrow down choices

Remember: You're not just selling products - you're helping customers look and feel their best! Every interaction should move them closer to a confident purchase decision.`;

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
        temperature: 0.8,
        max_tokens: 600
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
    
    // Generate contextual follow-up suggestions
    const suggestions = generateContextualSuggestions(message, productCatalog);

    return new Response(JSON.stringify({ 
      message: aiMessage,
      suggestions: suggestions,
      productCount: products?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-sales-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred',
      message: "I'm having trouble connecting right now. Please try again in a moment.",
      suggestions: [
        "Show me formal shirts",
        "What's on sale?",
        "Show trending products",
        "Help me find casual wear"
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
