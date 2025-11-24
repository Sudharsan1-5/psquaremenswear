import { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  stock: number;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function ProductImageGallery({ images, productName, stock, onError }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // If only one image, add placeholder images to show potential
  const displayImages = images.length > 0 ? images : ['/placeholder.svg'];
  const totalSlots = 4; // Show 4 image slots total

  const hasMultipleImages = displayImages.length > 1;

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
        <img
          src={displayImages[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1}`}
          className="w-full h-full object-cover"
          onError={onError}
        />

        {/* Stock Status Badge */}
        {stock < 10 && stock > 0 && (
          <Badge variant="destructive" className="absolute top-3 left-3 z-10 animate-pulse">
            Only {stock} left!
          </Badge>
        )}
        {stock === 0 && (
          <Badge className="absolute top-3 left-3 z-10 bg-gray-600">
            Out of Stock
          </Badge>
        )}

        {/* Navigation Arrows - Only show if multiple images */}
        {hasMultipleImages && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {displayImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      <div className="grid grid-cols-4 gap-2">
        {[...Array(totalSlots)].map((_, index) => {
          const hasImage = index < displayImages.length;
          const isActive = index === currentIndex;

          return (
            <button
              key={index}
              onClick={() => hasImage && setCurrentIndex(index)}
              className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                isActive
                  ? 'border-primary ring-2 ring-primary/20'
                  : hasImage
                  ? 'border-border hover:border-primary/50'
                  : 'border-dashed border-muted-foreground/30'
              } ${!hasImage && 'cursor-default'}`}
              disabled={!hasImage}
            >
              {hasImage ? (
                <img
                  src={displayImages[index]}
                  alt={`${productName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={onError}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/50" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint for single image */}
      {!hasMultipleImages && (
        <p className="text-xs text-muted-foreground text-center">
          More product angles coming soon!
        </p>
      )}
    </div>
  );
}
