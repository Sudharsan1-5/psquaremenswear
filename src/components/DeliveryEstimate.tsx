import { useState } from 'react';
import { Truck, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DeliveryEstimateProps {
  stock: number;
}

export function DeliveryEstimate({ stock }: DeliveryEstimateProps) {
  const [pincode, setPincode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkDelivery = () => {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return;
    }

    setChecking(true);

    // Simulate API call delay
    setTimeout(() => {
      // Calculate delivery date based on pincode (simplified logic)
      const today = new Date();
      let daysToAdd = 3; // Default delivery time

      // Metro cities get faster delivery (pincode starts with 1, 4, 5, 6)
      const firstDigit = pincode.charAt(0);
      if (['1', '4', '5', '6'].includes(firstDigit)) {
        daysToAdd = 2;
      }
      // Remote areas get slower delivery (pincode starts with 7, 8, 9)
      else if (['7', '8', '9'].includes(firstDigit)) {
        daysToAdd = 5;
      }

      // Add weekend delay
      const deliveryDay = new Date(today);
      deliveryDay.setDate(today.getDate() + daysToAdd);

      // Format date
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      const formattedDate = deliveryDay.toLocaleDateString('en-IN', options);

      setDeliveryDate(formattedDate);
      setChecking(false);
    }, 500);
  };

  if (stock === 0) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm sm:text-base">Delivery Options</h3>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPincode(value);
              setDeliveryDate(null);
            }}
            className="pl-9"
            maxLength={6}
          />
        </div>
        <Button
          onClick={checkDelivery}
          disabled={pincode.length !== 6 || checking}
          size="sm"
          variant="secondary"
        >
          {checking ? 'Checking...' : 'Check'}
        </Button>
      </div>

      {deliveryDate && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md animate-in fade-in slide-in-from-top-1">
          <p className="text-sm text-green-900 dark:text-green-100 font-medium">
            ✓ Estimated delivery by <span className="font-bold">{deliveryDate}</span>
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Free delivery on all orders
          </p>
        </div>
      )}

      {!deliveryDate && (
        <p className="text-xs text-muted-foreground mt-2">
          Enter your pincode to check delivery date
        </p>
      )}
    </div>
  );
}
