/**
 * Image Optimization Utility
 * 
 * Optimizes images before upload to reduce file size and improve load times.
 * Converts images to WebP format for better compression.
 */

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  format: 'webp',
};

/**
 * Optimizes an image file by resizing and compressing it
 * @param file - The image file to optimize
 * @param options - Optimization options
 * @returns Promise<Blob> - The optimized image as a Blob
 */
export const optimizeImage = async (
  file: File,
  options: OptimizationOptions = {}
): Promise<Blob> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > opts.maxWidth || height > opts.maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = opts.maxWidth;
              height = width / aspectRatio;
            } else {
              height = opts.maxHeight;
              width = height * aspectRatio;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log(`Image optimized: ${(file.size / 1024).toFixed(2)}KB → ${(blob.size / 1024).toFixed(2)}KB`);
                resolve(blob);
              } else {
                reject(new Error('Could not create blob'));
              }
            },
            `image/${opts.format}`,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Optimizes multiple images in parallel
 * @param files - Array of image files to optimize
 * @param options - Optimization options
 * @returns Promise<Blob[]> - Array of optimized images
 */
export const optimizeImages = async (
  files: File[],
  options: OptimizationOptions = {}
): Promise<Blob[]> => {
  return Promise.all(files.map((file) => optimizeImage(file, options)));
};

/**
 * Converts a Blob to a File object
 * @param blob - The blob to convert
 * @param fileName - The name for the file
 * @param fileType - The MIME type of the file
 * @returns File - The converted file
 */
export const blobToFile = (
  blob: Blob,
  fileName: string,
  fileType: string = 'image/webp'
): File => {
  return new File([blob], fileName, { type: fileType });
};

/**
 * Gets the dimensions of an image file
 * @param file - The image file
 * @returns Promise<{width: number, height: number}> - Image dimensions
 */
export const getImageDimensions = (
  file: File
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Validates if a file is an image
 * @param file - The file to validate
 * @returns boolean - True if the file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Formats file size in human-readable format
 * @param bytes - File size in bytes
 * @returns string - Formatted file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Example usage in AdminPanel or product upload:
 * 
 * const handleImageUpload = async (file: File) => {
 *   try {
 *     // Validate
 *     if (!isImageFile(file)) {
 *       throw new Error('Please select an image file');
 *     }
 * 
 *     // Get original dimensions
 *     const dimensions = await getImageDimensions(file);
 *     console.log('Original:', dimensions, formatFileSize(file.size));
 * 
 *     // Optimize
 *     const optimizedBlob = await optimizeImage(file, {
 *       maxWidth: 1200,
 *       maxHeight: 1200,
 *       quality: 0.8,
 *       format: 'webp'
 *     });
 * 
 *     // Convert to File
 *     const optimizedFile = blobToFile(
 *       optimizedBlob,
 *       file.name.replace(/\.[^/.]+$/, '.webp'),
 *       'image/webp'
 *     );
 * 
 *     console.log('Optimized:', formatFileSize(optimizedFile.size));
 * 
 *     // Upload to Supabase
 *     const { data, error } = await supabase.storage
 *       .from('product-images')
 *       .upload(`products/${Date.now()}-${optimizedFile.name}`, optimizedFile);
 * 
 *     if (error) throw error;
 *     
 *     // Get public URL
 *     const { data: { publicUrl } } = supabase.storage
 *       .from('product-images')
 *       .getPublicUrl(data.path);
 * 
 *     return publicUrl;
 *   } catch (error) {
 *     console.error('Image upload failed:', error);
 *     throw error;
 *   }
 * };
 */
