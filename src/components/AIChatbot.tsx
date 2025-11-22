import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

const formatMessage = (text: string) => {
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/^##\s+(.+)$/gm, '<strong>$1</strong>');
  formatted = formatted.replace(/^#\s+(.+)$/gm, '<strong>$1</strong>');
  return formatted;
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

const quickStartQuestions = [
  "Show me formal shirts",
  "What's on sale today?",
  "I need casual wear under ₹1000",
  "Show me trending products"
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Welcome to P Square Menswear! I'm your personal shopping assistant. I can help you find the perfect outfit based on your style, budget, and occasion. What are you looking for today?",
      suggestions: quickStartQuestions
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-sales-chat', {
        body: { message: textToSend }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message,
        suggestions: data.suggestions || []
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Connection Error",
        description: "Couldn't reach our AI assistant. Please try again.",
        variant: "destructive"
      });
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I'm having trouble connecting. Please try again in a moment!",
        suggestions: quickStartQuestions
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg bg-gradient-primary hover:shadow-glow z-50 touch-manipulation animate-pulse"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 left-0 sm:bottom-4 sm:right-4 sm:left-auto w-full sm:w-[min(90vw,420px)] h-[90vh] sm:h-[650px] sm:max-h-[90vh] bg-card border-t sm:border border-border sm:rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-primary">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-primary-foreground animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary-foreground">AI Sales Assistant</h3>
                <p className="text-xs text-primary-foreground/80">Your personal stylist</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20 touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-primary text-primary-foreground'
                        : 'bg-card border border-border text-foreground'
                    }`}
                  >
                    <p 
                      className="text-sm whitespace-pre-wrap leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                </div>
                
                {/* Suggestions */}
                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && idx === messages.length - 1 && (
                  <div className="flex flex-wrap gap-2 pl-2">
                    {msg.suggestions.map((suggestion, sIdx) => (
                      <Button
                        key={sIdx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/30 hover:border-primary"
                        disabled={isLoading}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-2 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Finding perfect matches...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about our products..."
                className="flex-1 h-11 text-sm bg-muted/50 border-border focus:border-primary"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-gradient-primary hover:shadow-glow h-11 w-11 touch-manipulation"
              >
                <Send className="h-5 w-5 text-primary-foreground" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              💡 Try: "Show me trending products" or "Formal shirts under ₹800"
            </p>
          </div>
        </div>
      )}
    </>
  );
}
