import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import AIChatbot from '@/components/AIChatbot';

const categories = ['All', 'T-Shirts', 'Shirts', 'Jeans', 'Formal Wear', 'Casual Wear'];

export default function Products() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchQuery = searchParams.get('search') || '';
  
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AIChatbot />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            P SQUARE MEN'S WEAR
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Premium collection of men's clothing with unmatched style and quality
          </p>
          
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedCategory === category 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : 'hover:bg-secondary/80'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {searchQuery && (
          <div className="mb-4 text-sm text-muted-foreground">
            Showing results for: <span className="font-semibold text-foreground">"{searchQuery}"</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              {searchQuery 
                ? `No products found for "${searchQuery}"`
                : "No products found in this category."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {selectedCategory === 'All' ? (
              // Group by category when "All" is selected
              categories.slice(1).map(category => {
                const categoryProducts = filteredProducts.filter(p => p.category === category);
                if (categoryProducts.length === 0) return null;
                
                return (
                  <div key={category} className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4 text-foreground">{category}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                      {categoryProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show flat grid when specific category is selected
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 animate-fade-in">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}