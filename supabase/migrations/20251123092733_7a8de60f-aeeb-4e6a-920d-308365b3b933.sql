-- Fix product image URLs (update wrong paths to correct ones)
-- This migration updates image paths from /src/assets/ to /assets/

UPDATE products 
SET image_url = REPLACE(image_url, '/src/assets/', '/assets/')
WHERE image_url LIKE '/src/assets/%';

-- Add a function to validate image URLs
CREATE OR REPLACE FUNCTION validate_product_image_url()
RETURNS TRIGGER AS $$
BEGIN
  -- If image_url is provided, ensure it's either a full URL or starts with /assets/
  IF NEW.image_url IS NOT NULL AND NEW.image_url != '' THEN
    IF NOT (
      NEW.image_url LIKE 'http://%' OR 
      NEW.image_url LIKE 'https://%' OR 
      NEW.image_url LIKE '/assets/%'
    ) THEN
      -- Auto-fix common mistakes
      IF NEW.image_url LIKE '/src/assets/%' THEN
        NEW.image_url := REPLACE(NEW.image_url, '/src/assets/', '/assets/');
      ELSE
        RAISE EXCEPTION 'Invalid image URL format. Must be a full URL or start with /assets/';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate image URLs on insert/update
DROP TRIGGER IF EXISTS validate_image_url_trigger ON products;
CREATE TRIGGER validate_image_url_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_image_url();