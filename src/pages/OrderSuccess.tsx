import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/Header';

export default function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Try to get data from location.state first, then from URL params
  let paymentId, orderDetails, items, total;
  
  if (location.state) {
    ({ paymentId, orderDetails, items, total } = location.state);
  } else {
    // Fallback: try to get from URL params (for new tab payments)
    paymentId = searchParams.get('payment_id');
    const orderDataParam = searchParams.get('order_data');
    if (orderDataParam) {
      try {
        const orderData = JSON.parse(orderDataParam);
        ({ orderDetails, items, total } = orderData);
      } catch (error) {
        console.error('Failed to parse order data from URL:', error);
      }
    }
  }

  useEffect(() => {
    if (!paymentId) {
      navigate('/');
    }
  }, [paymentId, navigate]);

  if (!paymentId) {
    return null;
  }

  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-success mb-2">Order Confirmed!</h1>
            <p className="text-lg text-muted-foreground">
              Thank you for your purchase. Your order has been successfully placed.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-semibold">{orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment ID</p>
                  <p className="font-semibold">{paymentId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-semibold">{estimatedDelivery}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <h4 className="font-semibold">Items Ordered:</h4>
                {items.map((item: any) => (
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
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Paid</span>
                  <span className="text-primary">₹{(total * 1.18).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {orderDetails?.fullName}</p>
                <p><strong>Phone:</strong> {orderDetails?.phone}</p>
                <p><strong>Email:</strong> {orderDetails?.email}</p>
                <p><strong>Address:</strong> {orderDetails?.address}</p>
                <p><strong>City:</strong> {orderDetails?.city}, {orderDetails?.pincode}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1"
            >
              Continue Shopping
            </Button>
            <Button
              onClick={() => window.print()}
              className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              Print Receipt
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              You will receive an email confirmation shortly with tracking details.
              For any queries, contact our support team.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}