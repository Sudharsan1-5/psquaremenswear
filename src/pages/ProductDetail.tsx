import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ShoppingCart, Zap, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Product, useCart, useWishlist } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
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

  const handleShare = async () => {
    const productUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Check out ${product?.name} on TechStore!`,
          url: productUrl,
        });
        toast({
          title: "Shared Successfully",
          description: "Thanks for sharing!",
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(productUrl);
      toast({
        title: "Link Copied!",
        description: "Product link copied to clipboard.",
      });
    }
  };

  const handleToggleWishlist = () => {
    if (product) {
      const wasInWishlist = isInWishlist(product.id);
      toggleWishlist(product);
      toast({
        title: wasInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
        description: wasInWishlist 
          ? `${product.name} removed from your wishlist.`
          : `${product.name} added to your wishlist.`,
      });
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
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-3 sm:py-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-3 sm:mb-4 h-10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <div className="relative">
            {product.image_url ? (
              <>
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                {/* Mobile-friendly Share & Wishlist buttons - always visible */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white text-foreground shadow-lg h-10 w-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                    }}
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className={`shadow-lg h-10 w-10 ${
                      product && isInWishlist(product.id) 
                        ? 'bg-destructive/90 hover:bg-destructive text-white' 
                        : 'bg-white/90 hover:bg-white text-foreground'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist();
                    }}
                  >
                    <Heart className={`h-5 w-5 ${product && isInWishlist(product.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
            {product.stock < 10 && product.stock > 0 && (
              <Badge variant="destructive" className="absolute top-2 left-2">
                Only {product.stock} left!
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <Badge className="mb-2 sm:mb-3 bg-accent text-accent-foreground text-xs sm:text-sm">
                {product.category}
              </Badge>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">{product.name}</h1>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-0.5">
                  {renderStars(product.rating)}
                </div>
                <span className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                  ({product.rating})
                </span>
              </div>
            </div>

            <div>
              <p className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">
                ₹{product.price.toFixed(2)}
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-base sm:text-lg mb-2">Description</h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                size="lg"
                variant="outline"
                className="flex-1 text-base lg:text-lg py-6"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              
              <Button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                size="lg"
                className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-300 text-base lg:text-lg py-6"
              >
                <Zap className="mr-2 h-5 w-5" />
                I Want This
              </Button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-1">Similar Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky mobile action buttons */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-40 shadow-lg">
        <div className="flex gap-2">
          <Button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            variant="outline"
            className="flex-1 h-12 text-base font-semibold"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>
          
          <Button
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="flex-1 h-12 bg-gradient-primary hover:shadow-glow transition-all duration-300 text-base font-semibold"
          >
            <Zap className="mr-2 h-5 w-5" />
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}
