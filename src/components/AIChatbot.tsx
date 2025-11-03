import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Simple function to convert basic markdown to HTML
const formatMessage = (text: string) => {
  // Convert **text** to <strong>text</strong>
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Convert *text* to <em>text</em>
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Convert ## headings to <strong> tags
  formatted = formatted.replace(/^##\s+(.+)$/gm, '<strong>$1</strong>');
  formatted = formatted.replace(/^#\s+(.+)$/gm, '<strong>$1</strong>');
  return formatted;
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your P Square style assistant. Tell me what you're looking for - price, size, color, style - and I'll find the perfect match!"
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-sales-chat', {
        body: { message: userMessage }
      });

      if (error) throw error;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message 
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
        content: "Sorry, I'm having trouble connecting. Please try again!" 
      }]);
    } finally {
      setIsLoading(false);
    }
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
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-50 touch-manipulation"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 left-0 sm:bottom-4 sm:right-4 sm:left-auto w-full sm:w-[min(90vw,400px)] h-[85vh] sm:h-[600px] sm:max-h-[85vh] bg-card border-t sm:border border-border sm:rounded-lg shadow-2xl flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-gradient-primary">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
              <h3 className="text-sm sm:text-base font-semibold text-primary-foreground">P Square AI Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-9 w-9 sm:h-8 sm:w-8 text-primary-foreground hover:bg-primary-foreground/20 touch-manipulation"
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p 
                    className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Finding perfect products...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., black t-shirt under ₹500"
                className="flex-1 h-11 text-base"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="bg-primary hover:bg-primary/90 h-11 w-11 touch-manipulation"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center leading-tight">
              Try: "Show me formal shirts" or "₹500 black t-shirt M size"
            </p>
          </div>
        </div>
      )}
    </>
  );
}
