import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
    images: string[];
  };
}

export function useWishlist() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = async () => {
    if (!user) {
      setWishlist([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First, get the wishlist items for the user
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist')
        .select('id, product_id, products(id, name, price, images)')
        .eq('user_id', user.id);

      if (wishlistError) throw wishlistError;

      // Type assertion to handle the response
      const typedWishlist = (wishlistData || []) as unknown as WishlistItem[];
      setWishlist(typedWishlist);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (productId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('wishlist')
        .insert([
          { 
            user_id: user.id, 
            product_id: productId 
          }
        ]);

      if (error) throw error;
      
      await fetchWishlist();
      return { success: true };
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      return { error: 'Failed to add to wishlist' };
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;
      
      setWishlist(prev => prev.filter(item => item.id !== wishlistId));
      return { success: true };
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      return { error: 'Failed to remove from wishlist' };
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.product_id === productId);
  };

  useEffect(() => {
    fetchWishlist();
  }, [user?.id]);

  return {
    wishlist,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist: fetchWishlist,
  };
}
