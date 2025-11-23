import { Button } from '@/components/ui/button';

interface SizeSelectorProps {
  category: string;
  selectedSize?: string;
  onSizeSelect: (size: string) => void;
  className?: string;
}

// Define size options based on product category
const getSizeOptions = (category: string): string[] => {
  const categoryLower = category.toLowerCase();

  // Shirts (Formal & Casual)
  if (categoryLower.includes('shirt') || categoryLower.includes('formal')) {
    return ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
  }

  // T-Shirts
  if (categoryLower.includes('t-shirt') || categoryLower.includes('tshirt')) {
    return ['S', 'M', 'L', 'XL', 'XXL'];
  }

  // Jeans & Pants
  if (categoryLower.includes('jean') || categoryLower.includes('pant') || categoryLower.includes('trouser')) {
    return ['28', '30', '32', '34', '36', '38', '40', '42'];
  }

  // Casual Wear (general)
  if (categoryLower.includes('casual')) {
    return ['S', 'M', 'L', 'XL', 'XXL'];
  }

  // Default sizes
  return ['S', 'M', 'L', 'XL', 'XXL'];
};

export function SizeSelector({ category, selectedSize, onSizeSelect, className = '' }: SizeSelectorProps) {
  const sizes = getSizeOptions(category);

  return (
    <div className={className}>
      <div className="mb-2">
        <label className="text-sm sm:text-base font-semibold">
          Select Size {selectedSize && <span className="text-muted-foreground">({selectedSize})</span>}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <Button
            key={size}
            variant={selectedSize === size ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSizeSelect(size)}
            className={`min-w-[50px] sm:min-w-[60px] h-10 sm:h-11 text-sm sm:text-base font-semibold transition-all duration-200 ${
              selectedSize === size
                ? 'ring-2 ring-primary ring-offset-2'
                : 'hover:border-primary hover:text-primary'
            }`}
          >
            {size}
          </Button>
        ))}
      </div>
      {!selectedSize && (
        <p className="text-xs sm:text-sm text-amber-600 mt-2">
          * Please select a size before adding to cart
        </p>
      )}
    </div>
  );
}
