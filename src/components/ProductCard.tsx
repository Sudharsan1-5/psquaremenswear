import { Star, Heart, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product, useWishlist } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
    toast({
      title: inWishlist ? "Removed from Wishlist" : "Added to Wishlist",
      description: inWishlist 
        ? `${product.name} removed from your wishlist.`
        : `${product.name} added to your wishlist.`,
    });
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} on PSquare Menswear`,
      url: `${window.location.origin}/product/${product.id}`,
    };

    try {
      if (navigator.share) {
        // Web Share API is supported
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Link copied to clipboard!',
          description: 'Share this link with others',
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // If sharing fails, fall back to copying to clipboard
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: 'Link copied to clipboard!',
        description: 'Share this link with others',
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 sm:h-4 sm:w-4 ${
          i < Math.floor(rating)
            ? 'text-accent fill-accent'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <Card 
      className="group overflow-hidden transition-all duration-200 hover:shadow-lg active:scale-[0.97] bg-card border cursor-pointer touch-manipulation relative h-full flex flex-col"
      onClick={() => navigate(`/product/${product.id}`)}
      onMouseEnter={(e) => e.currentTarget.classList.add('ring-1', 'ring-primary/20')}
      onMouseLeave={(e) => e.currentTarget.classList.remove('ring-1', 'ring-primary/20')}
    >
      <div className="relative overflow-hidden aspect-square">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-xs">No image</span>
          </div>
        )}
        {/* Stock Status Badge - Moved to top-left */}
        <div className="absolute top-2 left-2 z-10">
          {product.stock < 10 && product.stock > 0 && (
            <div className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-md shadow-md">
              Only {product.stock} left!
            </div>
          )}
          {product.stock === 0 && (
            <div className="bg-gray-600 text-white text-xs font-medium px-2 py-1 rounded-md shadow-md">
              Out of Stock
            </div>
          )}
        </div>

        {/* Wishlist and Share Buttons */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
          <Button
            variant="secondary"
            size="icon"
            className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 ${
              inWishlist 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-white/95 hover:bg-white text-rose-500 hover:text-rose-600 border border-gray-200'
            }`}
            onClick={handleWishlistClick}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart 
              className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ${
                inWishlist ? 'fill-current' : 'group-hover:scale-110'
              }`} 
            />
          </Button>
          
          <Button
            variant="secondary"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/95 hover:bg-white text-primary hover:text-primary/90 border border-gray-200 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 opacity-0 group-hover:translate-y-0 translate-y-2"
            onClick={handleShareClick}
            aria-label="Share product"
          >
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 group-hover:scale-110" />
          </Button>
        </div>
      </div>

      <CardContent className="p-2 sm:p-3 flex-grow flex flex-col">
        <h3 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[2.8rem]">
          {product.name}
        </h3>
        
        <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
          <div className="flex items-center">
            {renderStars(product.rating).slice(0, 1)}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{product.rating}</span>
        </div>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-bold text-primary">
              ₹{product.price.toFixed(0)}
            </span>
            {product.stock === 0 && (
              <span className="text-xs text-destructive font-medium">
                Out of Stock
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}