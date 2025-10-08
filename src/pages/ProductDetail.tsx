import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Product, useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
      
      // Fetch related products from the same category
      if (data?.category) {
        const { data: related } = await supabase
          .from('products')
          .select('*')
          .eq('category', data.category)
          .neq('id', id)
          .limit(4);
        
        setRelatedProducts(related || []);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product);
      navigate('/checkout');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < Math.floor(rating)
            ? 'text-accent fill-accent'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            ) : (
              <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            {product.stock < 10 && product.stock > 0 && (
              <Badge variant="destructive" className="absolute top-4 right-4">
                Only {product.stock} left!
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <Badge className="mb-3 bg-accent text-accent-foreground">
                {product.category}
              </Badge>
              <h1 className="text-3xl font-bold mb-3">{product.name}</h1>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  {renderStars(product.rating)}
                </div>
                <span className="text-lg text-muted-foreground">
                  ({product.rating})
                </span>
              </div>
            </div>

            <div>
              <p className="text-3xl font-bold text-primary mb-2">
                ₹{product.price.toFixed(2)}
              </p>
              <p className="text-muted-foreground">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-lg mb-2">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                size="lg"
                variant="outline"
                className="flex-1 text-lg py-6"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              
              <Button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                size="lg"
                className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg py-6"
              >
                <Zap className="mr-2 h-5 w-5" />
                I Want This
              </Button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Similar Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
