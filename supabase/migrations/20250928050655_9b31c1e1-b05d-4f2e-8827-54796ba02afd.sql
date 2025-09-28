-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  description TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Anyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing products from the static data (using UUID generation)
INSERT INTO public.products (name, price, image_url, category, description, rating, stock) VALUES
('Premium Wireless Headphones', 299.99, '/src/assets/product-headphones.jpg', 'Audio', 'High-quality wireless headphones with noise cancellation and premium sound quality. Perfect for music lovers and professionals.', 4.8, 25),
('Latest Smartphone', 899.99, '/src/assets/product-smartphone.jpg', 'Mobile', 'Cutting-edge smartphone with advanced camera system, fast processor, and all-day battery life.', 4.7, 15),
('Professional Laptop', 1299.99, '/src/assets/product-laptop.jpg', 'Computing', 'High-performance laptop perfect for professionals and creatives. Features latest processor and stunning display.', 4.9, 8),
('Smart Fitness Watch', 249.99, '/src/assets/product-smartwatch.jpg', 'Wearables', 'Advanced fitness tracking smartwatch with health monitoring, GPS, and long-lasting battery.', 4.6, 30),
('Wireless Earbuds Pro', 179.99, '/src/assets/product-headphones.jpg', 'Audio', 'Compact wireless earbuds with active noise cancellation and crystal clear audio quality.', 4.5, 40),
('Gaming Laptop', 1599.99, '/src/assets/product-laptop.jpg', 'Computing', 'High-performance gaming laptop with dedicated graphics card and advanced cooling system.', 4.8, 12);