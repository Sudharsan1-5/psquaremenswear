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
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-accent fill-accent'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <Card 
      className="group overflow-hidden transition-all duration-200 hover:shadow-lg active:scale-95 bg-card border cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative overflow-hidden aspect-square">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
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
          <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
            {product.stock} left
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 leading-tight">
          {product.name}
        </h3>
        
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center">
            {renderStars(product.rating).slice(0, 1)}
          </div>
          <span className="text-xs text-muted-foreground">{product.rating}</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-primary">
            ₹{product.price.toFixed(0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}