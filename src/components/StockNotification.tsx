import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface StockNotificationProps {
  productId: string;
  productName: string;
}

export function StockNotification({ productId, productName }: StockNotificationProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email && !phone) {
      toast({
        title: 'Email or Phone Required',
        description: 'Please provide at least one contact method.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone if provided
    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number.',
        variant: 'destructive',
      });
      return;
    }

    // Save notification request to localStorage (in production, save to database)
    const notifications = JSON.parse(localStorage.getItem('stock_notifications') || '[]');
    notifications.push({
      productId,
      productName,
      email,
      phone,
      requestedAt: new Date().toISOString(),
    });
    localStorage.setItem('stock_notifications', JSON.stringify(notifications));

    setSubmitted(true);

    toast({
      title: 'Notification Set!',
      description: "We'll notify you when this product is back in stock.",
    });

    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setEmail('');
      setPhone('');
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full">
          <Bell className="mr-2 h-5 w-5" />
          Notify Me When Available
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Get Stock Alert</DialogTitle>
          <DialogDescription>
            We'll notify you as soon as "{productName}" is back in stock.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-center mb-2">You're all set!</p>
            <p className="text-sm text-muted-foreground text-center">
              We'll send you a notification when the product is available.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-border"></div>
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(value);
                }}
                maxLength={10}
              />
            </div>

            <Button type="submit" className="w-full">
              <Bell className="mr-2 h-4 w-4" />
              Notify Me
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              We'll only use your contact info to notify you about this product.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
