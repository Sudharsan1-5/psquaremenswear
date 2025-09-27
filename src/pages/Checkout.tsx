import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, Shield, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Mock Razorpay integration
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface OrderDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    // Check if running in iframe
    setIsInIframe(window.self !== window.top);

    // Check for payment errors from URL params
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error && error === 'payment_failed') {
      toast({
        title: "Payment Failed",
        description: errorDescription || "Please try again or use a different payment method.",
        variant: "destructive",
      });
    }

    // Load Razorpay script if not in iframe
    if (window.self === window.top) {
      loadRazorpayScript();
    }
  }, [searchParams, toast]);

  const loadRazorpayScript = () => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log('Razorpay script loaded');
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
    };
    document.body.appendChild(script);
  };

  const handleInputChange = (field: keyof OrderDetails, value: string) => {
    setOrderDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['fullName', 'email', 'phone', 'address', 'city', 'pincode'];
    return required.every(field => orderDetails[field as keyof OrderDetails].trim() !== '');
  };

  const handlePayInNewTab = () => {
    if (!validateForm()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Store order data in session storage
    const orderData = {
      orderDetails,
      items,
      total
    };
    
    localStorage.setItem('checkout_order_data', JSON.stringify(orderData));
    
    // Open payment in new tab
    const payUrl = new URL('/pay', window.location.origin);
    window.open(payUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handlePayment = async () => {
    if (!validateForm()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({ title: "Login required", description: "Please sign in to continue." });
      navigate('/auth');
      return;
    }

    setLoading(true);

    if (!razorpayLoaded || !window.Razorpay) {
      toast({
        title: "Payment Error",
        description: "Payment gateway is not ready. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: { items, orderDetails },
      });

      if (error || !data?.razorpayOrderId) {
        throw new Error(error?.message || 'Failed to create order');
      }

      const { razorpayOrderId, keyId, amount, currency } = data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: "TechStore",
        description: "Order Payment",
        image: "/placeholder.svg",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
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

            toast({
              title: "Payment Successful!",
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });
            const totalWithTax = total * 1.18;
            clearCart();
            navigate('/order-success', {
              state: {
                paymentId: response.razorpay_payment_id,
                orderDetails,
                items,
                total: totalWithTax,
              },
            });
          } catch (err) {
            toast({
              title: 'Verification Failed',
              description: (err as Error).message,
              variant: 'destructive',
            });
            navigate('/checkout?error=payment_failed&error_description=Verification%20failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: orderDetails.fullName,
          email: orderDetails.email,
          contact: orderDetails.phone,
        },
        theme: { color: "#3B82F6" },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        method: { upi: true, card: true, wallet: true, netbanking: true },
      } as any;

      const paymentObject = new window.Razorpay(options);

      paymentObject.on('payment.failed', function (response: any) {
        toast({
          title: "Payment Failed",
          description: `Error: ${response.error?.description || "Please try again or use a different payment method."}`,
          variant: "destructive",
        });
        setLoading(false);
        const checkoutUrl = new URL('/checkout', window.location.origin);
        checkoutUrl.searchParams.set('error', 'payment_failed');
        checkoutUrl.searchParams.set('error_description', response.error?.description || 'Payment failed');
        window.location.href = checkoutUrl.toString();
      });

      paymentObject.open();
    } catch (e: any) {
      console.error('Payment init error', e);
      toast({ title: 'Payment Error', description: e?.message || 'Something went wrong', variant: 'destructive' });
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <Button onClick={() => navigate('/')}>Continue Shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        {/* Iframe Detection Banner */}
        {isInIframe && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    For secure payments, checkout opens in a new tab
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Payment gateways work best in full browser windows
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={orderDetails.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={orderDetails.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={orderDetails.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Full Address *</Label>
                <Input
                  id="address"
                  value={orderDetails.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter complete address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={orderDetails.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">PIN Code *</Label>
                  <Input
                    id="pincode"
                    value={orderDetails.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    placeholder="Enter PIN code"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Shield className="h-5 w-5 text-success" />
                <span className="text-sm">Your information is secured with 256-bit SSL encryption</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-success">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>₹{(total * 0.18).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{(total * 1.18).toFixed(2)}</span>
                  </div>
                </div>

                {isInIframe ? (
                  <Button
                    onClick={handlePayInNewTab}
                    disabled={loading}
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    size="lg"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Pay in New Tab ₹{(total * 1.18).toFixed(2)}
                  </Button>
                ) : (
                  <Button
                    onClick={handlePayment}
                    disabled={loading || !razorpayLoaded}
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    size="lg"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {loading ? "Processing..." : `Pay ₹${(total * 1.18).toFixed(2)}`}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  By proceeding, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}