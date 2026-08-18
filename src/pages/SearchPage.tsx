import { useEffect, useState, useCallback } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { useRouter } from '@/contexts/RouterContext';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Restaurant, RestaurantCategory, FoodItem } from '@/types';
import { getRestaurants, getRestaurantCategories, searchFoodItems } from '@/services/restaurantService';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/lib/utils';

export function SearchPage() {
  const { selectedLocation } = useLocation();
  const { path } = useRouter();

  const urlParams = new URLSearchParams(path.split('?')[1] || '');
  const initialQuery = urlParams.get('q') || '';
  const initialCategory = urlParams.get('category') || '';
  const initialFeatured = urlParams.get('featured') === 'true';
  const initialSort = urlParams.get('sort') || '';

  const [query, setQuery] = useState(initialQuery);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [foodResults, setFoodResults] = useState<(FoodItem & { restaurant?: Restaurant })[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState(initialSort || 'rating');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [openOnly, setOpenOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'food'>('restaurants');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rests, cats] = await Promise.all([
        getRestaurants({
          search: query,
          category: selectedCategory || undefined,
          featured: initialFeatured || undefined,
        }),
        getRestaurantCategories(),
      ]);

      let filtered = [...rests];
      if (minRating > 0) filtered = filtered.filter((r) => r.rating >= minRating);
      if (openOnly) filtered = filtered.filter((r) => r.is_open);

      if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
      else if (sortBy === 'delivery_time') filtered.sort((a, b) => a.estimated_delivery_time_min - b.estimated_delivery_time_min);
      else if (sortBy === 'delivery_fee') filtered.sort((a, b) => a.delivery_fee - b.delivery_fee);
      else if (sortBy === 'popular') filtered.sort((a, b) => b.review_count - a.review_count);

      setRestaurants(filtered);
      setCategories(cats);

      if (query) {
        const food = await searchFoodItems(query, 20);
        setFoodResults(food);
      } else {
        setFoodResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, sortBy, minRating, openOnly, initialFeatured]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants or food..."
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="btn-outline btn-md relative"
        >
          <SlidersHorizontal size={18} />
          Filters
          {(minRating > 0 || openOnly || selectedCategory) && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff5847] text-white text-[10px] font-bold flex items-center justify-center">
              {(minRating > 0 ? 1 : 0) + (openOnly ? 1 : 0) + (selectedCategory ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('')}
          className={`badge px-3 py-1.5 flex-shrink-0 ${
            !selectedCategory ? 'bg-[#ff5847] text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.slug ? '' : cat.slug)}
            className={`badge px-3 py-1.5 flex-shrink-0 ${
              selectedCategory === cat.slug ? 'bg-[#ff5847] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {query && (
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'restaurants' ? 'border-[#ff5847] text-[#ff5847]' : 'border-transparent text-gray-500'
            }`}
          >
            Restaurants ({restaurants.length})
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'food' ? 'border-[#ff5847] text-[#ff5847]' : 'border-transparent text-gray-500'
            }`}
          >
            Food Items ({foodResults.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
        </div>
      ) : activeTab === 'food' && foodResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {foodResults.map((item) => (
            <div key={item.id} className="card p-3 flex gap-3">
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'}
                alt={item.name}
                loading="lazy"
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{item.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{item.restaurant?.name}</p>
                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{item.description}</p>
                <span className="font-bold text-sm text-[#ff5847] mt-1 block">
                  {formatPrice(item.discounted_price ?? item.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <EmptyState
          title="No restaurants found"
          description="Try adjusting your search or filters to find what you're looking for."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              userLat={selectedLocation.lat}
              userLng={selectedLocation.lng}
            />
          ))}
        </div>
      )}

      {filterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFilterOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setFilterOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
                  <option value="rating">Highest Rated</option>
                  <option value="popular">Most Popular</option>
                  <option value="delivery_time">Fastest Delivery</option>
                  <option value="delivery_fee">Lowest Delivery Fee</option>
                </select>
              </div>

              <div>
                <label className="label">Minimum Rating</label>
                <div className="flex gap-2">
                  {[0, 3, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`badge px-3 py-1.5 ${
                        minRating === r ? 'bg-[#ff5847] text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r === 0 ? 'Any' : `${r}+`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(e) => setOpenOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#ff5847]"
                  />
                  <span className="text-sm font-medium">Open now</span>
                </label>
              </div>

              <button onClick={() => setFilterOpen(false)} className="btn-primary btn-lg w-full">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
