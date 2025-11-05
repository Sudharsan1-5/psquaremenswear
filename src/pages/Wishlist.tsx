import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Heart, ArrowRight, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
}

interface WishlistItem {
  id: string;
  product_id: string;
  products: Product;
}

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      // First, get the wishlist items for the user
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist')
        .select('id, product_id')
        .eq('user_id', user?.id);

      if (wishlistError) throw wishlistError;
      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        return;
      }

      // Then, get the product details for each item in the wishlist
      const productIds = wishlistData.map(item => item.product_id);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productsError) throw productsError;

      // Combine the wishlist items with their product details
      const itemsWithProducts = wishlistData.map(item => ({
        ...item,
        products: productsData.find(p => p.id === item.product_id)
      })).filter(item => item.products); // Filter out any items where product wasn't found

      setWishlistItems(itemsWithProducts);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wishlist',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId)
        .eq('user_id', user?.id); // Extra security check

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
      
      toast({
        title: 'Removed from wishlist',
        description: 'Item has been removed from your wishlist',
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item from wishlist',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
            <p className="mb-6">Please sign in to view your wishlist.</p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate('/products')}
            className="flex items-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-muted-foreground mb-6">Add items to your wishlist to save them for later</p>
            <Button onClick={() => navigate('/products')}>
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="flex flex-col h-full">
                <div className="relative group">
                  <img
                    src={item.products.images?.[0] || '/placeholder.svg'}
                    alt={item.products.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFromWishlist(item.id)}
                  >
                    <Heart className="h-5 w-5 fill-current text-destructive" />
                  </Button>
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="text-lg">{item.products.name}</CardTitle>
                </CardHeader>
                <CardFooter className="flex justify-between items-center">
                  <span className="font-semibold">₹{item.products.price.toFixed(2)}</span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate(`/product/${item.products.id}`)}
                    >
                      View
                    </Button>
                    <Button size="sm">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
