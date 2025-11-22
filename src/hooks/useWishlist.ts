import { useState, useEffect } from 'react';

// Simple local storage wishlist hook
export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('wishlist');
    if (stored) {
      try {
        setWishlistIds(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
  }, []);

  const saveWishlist = (ids: string[]) => {
    localStorage.setItem('wishlist', JSON.stringify(ids));
    setWishlistIds(ids);
  };

  const addToWishlist = (productId: string) => {
    if (!wishlistIds.includes(productId)) {
      const newWishlist = [...wishlistIds, productId];
      saveWishlist(newWishlist);
      return { success: true };
    }
    return { error: 'Already in wishlist' };
  };

  const removeFromWishlist = (productId: string) => {
    const newWishlist = wishlistIds.filter(id => id !== productId);
    saveWishlist(newWishlist);
    return { success: true };
  };

  const isInWishlist = (productId: string) => {
    return wishlistIds.includes(productId);
  };

  return {
    wishlistIds,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
  };
}
