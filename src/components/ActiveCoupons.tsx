import { useState, useEffect } from 'react';
import { Tag, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  valid_until: string;
  max_uses: number;
  current_uses: number;
}

export function ActiveCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveCoupons();
  }, []);

  const fetchActiveCoupons = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .gte('valid_until', now)
        .order('discount_percentage', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Filter out fully used coupons
      const activeCoupons = (data || []).filter(
        (coupon: Coupon) => coupon.current_uses < coupon.max_uses
      );

      setCoupons(activeCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: 'Coupon Code Copied!',
        description: `Use code "${code}" at checkout`,
      });

      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (coupons.length === 0) return null;

  return (
    <Card className="border-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-900 dark:text-green-100">
            Active Offers
          </h3>
        </div>

        <div className="space-y-2">
          {coupons.map((coupon) => {
            const daysLeft = Math.ceil(
              (new Date(coupon.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div
                key={coupon.id}
                className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      {coupon.discount_percentage}% OFF
                    </Badge>
                    {daysLeft <= 3 && (
                      <span className="text-xs text-amber-600 font-medium">
                        {daysLeft === 0 ? 'Expires today!' : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {coupon.code}
                    </code>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={copiedCode === coupon.code ? 'default' : 'outline'}
                  onClick={() => handleCopyCode(coupon.code)}
                  className="flex-shrink-0"
                >
                  {copiedCode === coupon.code ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Apply at checkout to save on your purchase
        </p>
      </CardContent>
    </Card>
  );
}
