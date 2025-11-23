-- Fix search_path security issue for the image validation function
ALTER FUNCTION validate_product_image_url() SET search_path = public;

-- Update the function to be immutable where possible
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
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;