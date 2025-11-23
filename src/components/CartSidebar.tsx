import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

export function CartSidebar() {
  const { items, total, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Your cart is empty</h3>
        <p className="text-sm text-muted-foreground text-center">
          Add some products to get started!
        </p>
      </div>
    );
  }

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold">Shopping Cart</h2>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 sm:space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex space-x-2 sm:space-x-3">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">No img</span>
                </div>
              )}
              <div className="flex-1 space-y-2 min-w-0">
                <h4 className="font-medium text-xs sm:text-sm line-clamp-2">{item.name}</h4>
                {item.selectedSize && (
                  <p className="text-xs text-muted-foreground">Size: {item.selectedSize}</p>
                )}
                <p className="text-sm sm:text-base font-semibold text-primary">
                  ₹{item.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                    >
                      <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="text-sm sm:text-base w-8 sm:w-10 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                      disabled={item.quantity >= item.stock}
                      title={item.quantity >= item.stock ? `Only ${item.stock} available` : ''}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 text-destructive touch-manipulation"
                    onClick={() => removeFromCart(item.id, item.selectedSize)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {item.quantity >= item.stock && item.stock > 0 && (
                  <p className="text-xs text-amber-600 mt-1">Maximum available quantity</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
        <Separator />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base sm:text-lg">Total:</span>
          <span className="text-lg sm:text-xl font-bold text-primary">
            ₹{total.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={handleCheckout}
          className="w-full h-11 sm:h-12 text-base font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}