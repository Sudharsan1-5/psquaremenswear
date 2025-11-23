import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, Shield, Loader2 } from 'lucide-react';
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

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  valid_until: string;
  max_uses: number;
  current_uses: number;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });
  const { user } = useAuth();

  const discount = appliedCoupon ? (total * appliedCoupon.discount_percentage) / 100 : 0;
  const subtotalAfterDiscount = total - discount;
  const tax = subtotalAfterDiscount * 0.18;
  const finalTotal = subtotalAfterDiscount + tax;

  useEffect(() => {
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

    // Load Razorpay script
    loadRazorpayScript();
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

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Invalid Coupon",
        description: "Please enter a coupon code.",
        variant: "destructive",
      });
      return;
    }

    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Invalid Coupon",
          description: "This coupon code does not exist.",
          variant: "destructive",
        });
        return;
      }

      const now = new Date();
      const validUntil = new Date(data.valid_until);

      if (validUntil < now) {
        toast({
          title: "Expired Coupon",
          description: "This coupon has expired.",
          variant: "destructive",
        });
        return;
      }

      if (data.current_uses >= data.max_uses) {
        toast({
          title: "Coupon Limit Reached",
          description: "This coupon has been fully redeemed.",
          variant: "destructive",
        });
        return;
      }

      setAppliedCoupon(data);
      toast({
        title: "Coupon Applied!",
        description: `${data.discount_percentage}% discount applied to your order.`,
      });
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast({
        title: "Error",
        description: "Failed to apply coupon. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast({
      title: "Coupon Removed",
      description: "Coupon discount has been removed.",
    });
  };

  const handleInputChange = (field: keyof OrderDetails, value: string) => {
    // Sanitize and validate input
    let sanitizedValue = value.trim();
    
    // Prevent excessively long inputs
    const maxLengths: { [key: string]: number } = {
      fullName: 100,
      email: 255,
      phone: 15,
      address: 200,
      city: 50,
      pincode: 10
    };
    
    if (sanitizedValue.length > (maxLengths[field] || 100)) {
      return;
    }
    
    // Validate phone number (only digits, +, -, spaces, parentheses)
    if (field === 'phone' && sanitizedValue && !/^[0-9+\-\s()]*$/.test(sanitizedValue)) {
      return;
    }
    
    // Validate pincode (only digits)
    if (field === 'pincode' && sanitizedValue && !/^[0-9]*$/.test(sanitizedValue)) {
      return;
    }
    
    setOrderDetails(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const validateForm = () => {
    // Check all required fields are filled
    const required = ['fullName', 'email', 'phone', 'address', 'city', 'pincode'];
    const allFilled = required.every(field => orderDetails[field as keyof OrderDetails].trim() !== '');
    
    if (!allFilled) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all delivery details.",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderDetails.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate phone number (at least 10 digits)
    const phoneDigits = orderDetails.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate pincode (6 digits for India)
    if (orderDetails.pincode.length !== 6 || !/^\d{6}$/.test(orderDetails.pincode)) {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid 6-digit pincode.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };


  const handlePayment = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    // Check authentication
    if (!user) {
      toast({ 
        title: "Authentication Required", 
        description: "Please sign in to complete your purchase.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    // Check Razorpay loaded
    if (!razorpayLoaded || !window.Razorpay) {
      toast({
        title: "Payment Gateway Loading",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create order on backend
      console.log('Creating order...');
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: { 
          items, 
          orderDetails,
          coupon: appliedCoupon ? {
            id: appliedCoupon.id,
            code: appliedCoupon.code,
            discount_percentage: appliedCoupon.discount_percentage
          } : null
        },
      });

      if (error) {
        console.error('Order creation error:', error);
        throw new Error(error.message || 'Failed to create order. Please try again.');
      }

      if (!data?.razorpayOrderId || !data?.keyId) {
        console.error('Invalid order response:', data);
        throw new Error('Invalid order response from server. Please contact support.');
      }

      const { razorpayOrderId, keyId, amount, currency } = data;
      console.log('Order created successfully:', razorpayOrderId);

      // Step 2: Configure Razorpay modal
      const options = {
        key: keyId,
        amount: amount,
        currency: currency || "INR",
        name: "P Square Menswear",
        description: `Order Payment${appliedCoupon ? ` (${appliedCoupon.code} applied)` : ''}`,
        image: "/placeholder.svg",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          console.log('Payment successful, verifying...');
          try {
            // Step 3: Verify payment
            const verifyRes = await supabase.functions.invoke('verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyRes.error) {
              console.error('Verification error:', verifyRes.error);
              throw new Error(verifyRes.error.message || 'Payment verification failed');
            }

            if (!verifyRes.data?.success) {
              throw new Error('Payment verification failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
            }

            console.log('Payment verified successfully');
            
            // Step 4: Success - clear cart and navigate
            toast({
              title: "Payment Successful! 🎉",
              description: `Your order has been confirmed. Payment ID: ${response.razorpay_payment_id}`,
            });
            
            clearCart();
            navigate('/order-success', {
              state: {
                paymentId: response.razorpay_payment_id,
                orderDetails,
                items,
                total: finalTotal,
              },
            });
          } catch (err) {
            console.error('Payment verification error:', err);
            const errorMsg = err instanceof Error ? err.message : 'Payment verification failed';
            toast({
              title: 'Verification Failed',
              description: errorMsg,
              variant: 'destructive',
            });
            setLoading(false);
          }
        },
        prefill: {
          name: orderDetails.fullName,
          email: orderDetails.email,
          contact: orderDetails.phone,
        },
        notes: {
          order_type: 'ecommerce',
          customer_id: user.id,
        },
        theme: { 
          color: "#3B82F6",
          backdrop_color: "rgba(0, 0, 0, 0.5)"
        },
        modal: {
          ondismiss: function () {
            console.log('Payment modal dismissed by user');
            toast({
              title: "Payment Cancelled",
              description: "You can continue shopping or try payment again.",
            });
            setLoading(false);
          },
          escape: true,
          confirm_close: true,
        },
        method: { 
          upi: true, 
          card: true, 
          wallet: true, 
          netbanking: true 
        },
      } as any;

      // Step 5: Open Razorpay modal
      console.log('Opening Razorpay modal...');
      const paymentObject = new window.Razorpay(options);

      // Handle payment failures
      paymentObject.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        const errorDesc = response.error?.description || 'Payment could not be completed';
        const errorReason = response.error?.reason || '';
        
        let userMessage = errorDesc;
        if (errorReason === 'payment_failed') {
          userMessage = 'Payment declined. Please check your payment details and try again.';
        } else if (errorReason === 'payment_cancelled') {
          userMessage = 'Payment was cancelled. Please try again when ready.';
        }

        toast({
          title: "Payment Failed",
          description: userMessage,
          variant: "destructive",
        });
        setLoading(false);
      });

      paymentObject.open();
      
    } catch (e: any) {
      console.error('Payment initialization error:', e);
      const errorMessage = e?.message || 'Unable to initialize payment. Please check your connection and try again.';
      
      toast({ 
        title: 'Payment Error', 
        description: errorMessage, 
        variant: 'destructive' 
      });
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
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
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No img</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <Separator />
                
                {/* Coupon Code Section */}
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                  <Label htmlFor="coupon">Have a Coupon Code?</Label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                      <div>
                        <p className="font-semibold text-success">{appliedCoupon.code}</p>
                        <p className="text-sm text-muted-foreground">{appliedCoupon.discount_percentage}% discount applied</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeCoupon}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id="coupon"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="flex-1"
                      />
                      <Button
                        onClick={applyCoupon}
                        disabled={couponLoading}
                        variant="secondary"
                      >
                        {couponLoading ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-success">
                      <span>Coupon Discount ({appliedCoupon.discount_percentage}%)</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-success">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (18%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={loading || !razorpayLoaded}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now ₹{finalTotal.toFixed(2)}
                    </>
                  )}
                </Button>

                {!razorpayLoaded && (
                  <p className="text-xs text-muted-foreground text-center">
                    Loading payment gateway...
                  </p>
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