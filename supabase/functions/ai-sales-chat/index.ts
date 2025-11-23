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

// Helper to detect navigation intent
function detectNavigationIntent(message: string, products: any[]) {
  const msg = message.toLowerCase();
  
  // Check for specific product mentions
  for (const product of products) {
    if (msg.includes(product.name.toLowerCase())) {
      return {
        type: 'navigation',
        path: `/product/${product.id}`,
        message: `Taking you to ${product.name}...`
      };
    }
  }
  
  // Check for category navigation
  if (msg.includes('formal') || msg.includes('shirt')) {
    return {
      type: 'navigation',
      path: '/products?category=Formal Shirts',
      message: 'Taking you to our formal shirts collection...'
    };
  }
  
  if (msg.includes('casual')) {
    return {
      type: 'navigation',
      path: '/products?category=Casual',
      message: 'Taking you to our casual wear collection...'
    };
  }
  
  if (msg.includes('checkout') || msg.includes('cart')) {
    return {
      type: 'navigation',
      path: '/checkout',
      message: 'Taking you to checkout...'
    };
  }

  if (msg.includes('all products') || msg.includes('browse') || msg.includes('shop')) {
    return {
      type: 'navigation',
      path: '/products',
      message: 'Taking you to our products page...'
    };
  }
  
  return null;
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
      // Return helpful fallback when API key is missing
      const encoder = new TextEncoder();
      const fallbackMsg = "I apologize, but I'm experiencing technical difficulties. However, you can browse our products above! What would you like to know about our store?";
      
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: fallbackMsg })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'suggestions', suggestions: ['Show me all products', 'Browse categories', 'Tell me about your store'] })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }
      });
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

    // Detect navigation intent
    const navigationCommand = detectNavigationIntent(message, productCatalog);

    // Enhanced sales-focused system prompt with navigation
    const systemPrompt = `You are Ravi, an expert sales consultant at P SQUARE MEN'S WEAR - a premium men's clothing store. You're knowledgeable, enthusiastic, and great at understanding customer needs.

PRODUCT CATALOG:
${JSON.stringify(productCatalog, null, 2)}

YOUR SALES PERSONALITY:
- Warm, friendly, and genuinely helpful - speak naturally like a real person
- Use conversational language with personality and enthusiasm
- Show empathy and understanding of customer needs
- Create excitement about products without being pushy
- Build trust through honest recommendations
- Guide customers smoothly through their shopping journey

SALES APPROACH:
1. LISTEN & UNDERSTAND: Really hear what the customer wants
2. RECOMMEND: Match them with perfect products from our catalog
3. EXPLAIN: Share why it's great for THEM specifically
4. NAVIGATE: Guide them to view products when they're interested
5. FOLLOW UP: Ask natural follow-up questions to help more

COMMUNICATION STYLE:
- Speak like a helpful friend, not a robot
- Use natural expressions: "I think you'd love...", "Have you considered...", "Let me show you..."
- Keep it conversational and flowing
- Vary your sentence structure and length
- Show personality with appropriate emojis 😊 ✨ 🎯
- DO NOT use markdown *, **, #, ## - speak in plain conversational text

NAVIGATION & GUIDANCE:
- When customer shows interest in products, tell them you'll take them there
- Use phrases like: "Let me take you to that product", "I'll show you our collection", "Taking you there now!"
- Be proactive in guiding them to relevant pages

PRODUCT RECOMMENDATIONS:
- Highlight what makes it special for THIS customer
- "This would be perfect for..." instead of just listing features
- Create desire: "Imagine yourself in this at..."
- Show confidence: "I really think you'll love..."
- Build urgency naturally: "These are flying off the shelves"

HANDLING RESPONSES:
- Budget concerns: "I have something amazing in your range..."
- Unsure customer: "Tell me more about what you're looking for"
- No exact match: "While we don't have that exact item, I have something even better..."
- Out of stock: "That's popular! Let me show you something similar that customers love"

Remember: You're a real person helping them find what they need. Be warm, helpful, and guide them naturally through their shopping journey. Build rapport and make it feel like they're shopping with a knowledgeable friend!`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call Mistral AI with streaming
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
              max_tokens: 600,
              stream: true
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Mistral API error: ${response.status}`, errorText);
            
            // Handle rate limiting gracefully
            if (response.status === 429) {
              const fallbackMsg = "I apologize, but I'm receiving a lot of requests right now! 😅 While I catch my breath, feel free to browse our products above. I'll be back to full speed shortly!";
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: fallbackMsg })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'suggestions', 
                suggestions: ['Show me all products', 'What categories do you have?', 'Tell me about your store'] 
              })}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
              return;
            }
            
            throw new Error(`Mistral API error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter(line => line.trim() !== '');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices[0]?.delta?.content;
                    
                    if (content) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`)
                      );
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }

          // Send suggestions
          const suggestions = generateContextualSuggestions(message, productCatalog);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'suggestions', suggestions })}\n\n`)
          );

          // Send navigation command if detected
          if (navigationCommand) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'navigation', command: navigationCommand })}\n\n`)
            );
          }

          // Send done signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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
