import { useEffect } from 'react';
import { Product } from '@/contexts/CartContext';

const STORAGE_KEY = 'psquare_recently_viewed';
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const addToRecentlyViewed = (product: Product) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      // Remove if already exists to avoid duplicates
      const filtered = existing.filter((p: Product) => p.id !== product.id);

      // Add to beginning of array
      const updated = [product, ...filtered].slice(0, MAX_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving to recently viewed:', error);
    }
  };

  const getRecentlyViewed = (): Product[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      console.error('Error getting recently viewed:', error);
      return [];
    }
  };

  const clearRecentlyViewed = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    addToRecentlyViewed,
    getRecentlyViewed,
    clearRecentlyViewed,
  };
}
