import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

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
      className="group overflow-hidden transition-all duration-200 hover:shadow-lg active:scale-[0.97] bg-card border cursor-pointer touch-manipulation"
      onClick={() => navigate(`/product/${product.id}`)}
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
        {product.stock < 10 && product.stock > 0 && (
          <Badge variant="destructive" className="absolute top-1.5 right-1.5 text-[10px] sm:text-xs px-1.5 py-0.5">
            {product.stock} left
          </Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs sm:text-sm">Out of Stock</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-2 sm:p-3">
        <h3 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[2.8rem]">
          {product.name}
        </h3>
        
        <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
          <div className="flex items-center">
            {renderStars(product.rating).slice(0, 1)}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{product.rating}</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-base sm:text-lg font-bold text-primary">
            ₹{product.price.toFixed(0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}