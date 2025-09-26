import { Product } from '@/contexts/CartContext';
import productHeadphones from '@/assets/product-headphones.jpg';
import productSmartphone from '@/assets/product-smartphone.jpg';
import productLaptop from '@/assets/product-laptop.jpg';
import productSmartwatch from '@/assets/product-smartwatch.jpg';

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 299.99,
    image: productHeadphones,
    category: 'Audio',
    description: 'High-quality wireless headphones with noise cancellation and premium sound quality. Perfect for music lovers and professionals.',
    rating: 4.8,
    stock: 25,
  },
  {
    id: '2',
    name: 'Latest Smartphone',
    price: 899.99,
    image: productSmartphone,
    category: 'Mobile',
    description: 'Cutting-edge smartphone with advanced camera system, fast processor, and all-day battery life.',
    rating: 4.7,
    stock: 15,
  },
  {
    id: '3',
    name: 'Professional Laptop',
    price: 1299.99,
    image: productLaptop,
    category: 'Computing',
    description: 'High-performance laptop perfect for professionals and creatives. Features latest processor and stunning display.',
    rating: 4.9,
    stock: 8,
  },
  {
    id: '4',
    name: 'Smart Fitness Watch',
    price: 249.99,
    image: productSmartwatch,
    category: 'Wearables',
    description: 'Advanced fitness tracking smartwatch with health monitoring, GPS, and long-lasting battery.',
    rating: 4.6,
    stock: 30,
  },
  {
    id: '5',
    name: 'Wireless Earbuds Pro',
    price: 179.99,
    image: productHeadphones,
    category: 'Audio',
    description: 'Compact wireless earbuds with active noise cancellation and crystal clear audio quality.',
    rating: 4.5,
    stock: 40,
  },
  {
    id: '6',
    name: 'Gaming Laptop',
    price: 1599.99,
    image: productLaptop,
    category: 'Computing',
    description: 'High-performance gaming laptop with dedicated graphics card and advanced cooling system.',
    rating: 4.8,
    stock: 12,
  },
];