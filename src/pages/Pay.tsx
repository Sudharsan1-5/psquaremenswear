import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Razorpay integration
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface OrderData {
  orderDetails: any;
  items: any[];
  total: number;
  coupon?: {
    id: string;
    code: string;
    discount_percentage: number;
  } | null;
}

export default function Pay() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Check if we have order data in sessionStorage
    const storedOrderData = localStorage.getItem('checkout_order_data') || sessionStorage.getItem('checkout_order_data');
    if (!storedOrderData) {
      toast({
        title: "Session Expired",
        description: "Please return to checkout and try again.",
        variant: "destructive",
      });
      navigate('/checkout');
      return;
    }

    try {
      const parsedData = JSON.parse(storedOrderData);
      setOrderData(parsedData);
      console.log('Pay page loaded with order data:', parsedData);
    } catch (error) {
      console.error('Failed to parse order data:', error);
      toast({
        title: "Invalid Order Data",
        description: "Please return to checkout and try again.",
        variant: "destructive",
      });
      navigate('/checkout');
      return;
    }

    // Load Razorpay script
    loadRazorpayScript();
  }, [navigate, toast]);

  const loadRazorpayScript = () => {
    // Check if already loaded
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      setRazorpayLoaded(true);
      setLoading(false);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      toast({
        title: "Payment Error",
        description: "Failed to load payment gateway. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    };
    document.body.appendChild(script);
  };

  const initiatePayment = async () => {
    if (!orderData || !razorpayLoaded) {
      toast({
        title: "Not Ready",
        description: "Payment system is not ready. Please wait.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call create-order endpoint to get the Razorpay order with correct amount
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: { 
          items: orderData.items,
          orderDetails: orderData.orderDetails,
          coupon: orderData.coupon || null
        },
      });

      if (error || !data?.razorpayOrderId) {
        throw new Error(error?.message || 'Failed to create order');
      }

      const { razorpayOrderId, keyId, amount } = data;
      
      const options = {
        key: keyId,
        amount: amount,
        currency: "INR",
        name: "PSquare Menswear",
        description: `Order Payment${orderData.coupon ? ` (${orderData.coupon.code} applied)` : ''}`,
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          console.log("Payment successful:", response);
          
          try {
            const verifyRes = await supabase.functions.invoke('verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyRes.error || !verifyRes.data?.success) {
              throw new Error(verifyRes.error?.message || 'Payment verification failed');
            }

            // Clear stored order data
            localStorage.removeItem('checkout_order_data');
            sessionStorage.removeItem('checkout_order_data');
            
            // Redirect to success page
            const successUrl = new URL('/order-success', window.location.origin);
            successUrl.searchParams.set('payment_id', response.razorpay_payment_id);
            successUrl.searchParams.set('order_data', JSON.stringify({
              paymentId: response.razorpay_payment_id,
              orderDetails: orderData.orderDetails,
              items: orderData.items,
              total: orderData.total,
              coupon: orderData.coupon
            }));
            
            window.location.href = successUrl.toString();
          } catch (err) {
            console.error('Payment verification error:', err);
            toast({
              title: 'Verification Failed',
              description: (err as Error).message || 'Failed to verify payment',
              variant: 'destructive',
            });
            navigate('/checkout?error=verification_failed');
          }
        },
        prefill: {
          name: orderData.orderDetails.fullName,
          email: orderData.orderDetails.email,
          contact: orderData.orderDetails.phone,
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: function() {
            console.log("Payment modal dismissed");
            setLoading(false);
          }
        },
        method: {
          upi: true,
          card: true,
          wallet: true,
          netbanking: true
        }
      };

      console.log("Initiating Razorpay payment with options:", options);
      
      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response: any) {
        console.log("Payment failed:", response);
        toast({
          title: "Payment Failed",
          description: response.error?.description || "Payment could not be completed",
          variant: "destructive",
        });
        
        // Redirect back to checkout with error
        const checkoutUrl = new URL('/checkout', window.location.origin);
        checkoutUrl.searchParams.set('error', 'payment_failed');
        checkoutUrl.searchParams.set('error_description', response.error?.description || 'Payment failed');
        
        window.location.href = checkoutUrl.toString();
      });
      
      paymentObject.open();
    } catch (e: any) {
      console.error('Payment initialization error:', e);
      toast({
        title: 'Payment Error',
        description: e?.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Loading Payment Gateway</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Please wait while we prepare your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Session Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">Your payment session has expired.</p>
            <Button onClick={() => navigate('/checkout')}>Return to Checkout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Complete Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              ₹{(orderData.total * 1.18).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              {orderData.items.length} item(s) • Tax included
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Delivery to:</span>
              <span className="font-medium">{orderData.orderDetails.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{orderData.orderDetails.email}</span>
            </div>
          </div>

          <Button 
            onClick={initiatePayment}
            disabled={loading || !razorpayLoaded}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {loading ? "Processing..." : `Pay ₹${(orderData.total * 1.18).toFixed(2)}`}
          </Button>

          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                localStorage.removeItem('checkout_order_data');
                sessionStorage.removeItem('checkout_order_data');
                navigate('/checkout');
              }}
            >
              Cancel & Return to Checkout
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Razorpay
          </p>
        </CardContent>
      </Card>
    </div>
  );
}