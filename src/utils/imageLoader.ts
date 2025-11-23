// Image loader utility to handle product images correctly

export const getProductImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) {
    return '/placeholder.svg';
  }

  // If it's already a full URL (Supabase storage), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it's a relative path starting with /src/assets (wrong path from DB)
  if (imageUrl.startsWith('/src/assets/')) {
    // Convert to correct path
    return imageUrl.replace('/src/assets/', '/assets/');
  }

  // If it starts with /assets/, it's correct
  if (imageUrl.startsWith('/assets/')) {
    return imageUrl;
  }

  // Default fallback
  return '/placeholder.svg';
};

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};
