import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import AIChatbot from '@/components/AIChatbot';



export default function Products() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>(['All']);

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
      
      // Extract unique categories from products
      const uniqueCategories = Array.from(new Set(data?.map(p => p.category).filter(Boolean) || []));
      setCategories(['All', ...uniqueCategories]);
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
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-primary bg-clip-text text-transparent px-1">
            P SQUARE MEN'S WEAR
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 px-1">
            Premium collection of men's clothing with unmatched style and quality
          </p>
          
          {/* Horizontal scrollable category badges on mobile */}
          <div className="-mx-2 px-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2 min-w-max">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "secondary"}
                  className={`cursor-pointer transition-all duration-200 whitespace-nowrap px-4 py-2 text-sm sm:text-base h-9 sm:h-10 ${
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
        </div>

        {searchQuery && (
          <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground px-1">
            Showing results for: <span className="font-semibold text-foreground">"{searchQuery}"</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 sm:py-16">
            <p className="text-base sm:text-lg text-muted-foreground">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <p className="text-base sm:text-lg text-muted-foreground">
              {searchQuery 
                ? `No products found for "${searchQuery}"`
                : "No products found in this category."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {selectedCategory === 'All' ? (
              // Group by category when "All" is selected
              categories.slice(1).map(category => {
                const categoryProducts = filteredProducts.filter(p => p.category === category);
                if (categoryProducts.length === 0) return null;
                
                return (
                  <div key={category} className="animate-fade-in">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-foreground px-1">{category}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                      {categoryProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show flat grid when specific category is selected
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 animate-fade-in">
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