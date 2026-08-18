import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Clock, Bike, MapPin, Star, Search, Heart, Share2 } from 'lucide-react';
import type { Restaurant, FoodCategory, FoodItem, Review } from '@/types';
import {
  getRestaurantBySlug,
  getFoodCategories,
  getFoodItems,
  getFoodItemDetails,
} from '@/services/restaurantService';
import { getRestaurantReviews } from '@/services/orderService';
import { FoodCard } from '@/components/FoodCard';
import { FoodCustomizationModal } from '@/components/FoodCustomizationModal';
import { RatingStars, ReviewStars } from '@/components/ui/RatingStars';
import { RestaurantCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice, isRestaurantOpen } from '@/lib/utils';
import { addToCart, getCart, createCart, clearCart, deleteCart } from '@/services/cartService';
import type { SelectedVariation, SelectedAddon } from '@/types';

export function RestaurantDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState('');
  const [customizingItem, setCustomizingItem] = useState<FoodItem | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rest = await getRestaurantBySlug(slug);
      if (!rest) {
        showToast('Restaurant not found', 'error');
        navigate('/search');
        return;
      }
      setRestaurant(rest);

      const [cats, items, revs] = await Promise.all([
        getFoodCategories(rest.id),
        getFoodItems(rest.id),
        getRestaurantReviews(rest.id),
      ]);
      setCategories(cats);
      setFoodItems(items);
      setReviews(revs);
      if (cats.length > 0) setActiveCategory(cats[0].id);

      if (profile) {
        const cart = await getCart(profile.id);
        if (cart && cart.items) setCartCount(cart.items.length);
      }
    } catch (err) {
      console.error('Failed to load restaurant:', err);
      showToast('Failed to load restaurant', 'error');
    } finally {
      setLoading(false);
    }
  }, [slug, navigate, showToast, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddItem(item: FoodItem) {
    if (!profile) {
      showToast('Please sign in to add items to cart', 'info');
      navigate('/signin');
      return;
    }
    if (!restaurant) return;

    try {
      const details = await getFoodItemDetails(item.id);
      const hasCustomization =
        details.variations.length > 0 || details.addons.length > 0;

      if (hasCustomization) {
        setCustomizingItem(item);
        return;
      }

      let cart = await getCart(profile.id);
      if (cart && cart.restaurant_id !== restaurant.id) {
        await clearCart(cart.id);
        await deleteCart(cart.id);
        cart = null;
      }
      if (!cart) {
        const cartId = await createCart(profile.id, restaurant.id);
        cart = { id: cartId, user_id: profile.id, restaurant_id: restaurant.id } as never;
      }

      const unitPrice = item.discounted_price ?? item.price;
      await addToCart(cart.id, {
        food_item_id: item.id,
        name: item.name,
        image_url: item.image_url,
        base_price: item.price,
        quantity: 1,
        selected_variations: [],
        selected_addons: [],
        special_instructions: '',
        unit_price: unitPrice,
        total_price: unitPrice,
      });

      setCartCount((prev) => prev + 1);
      showToast(`${item.name} added to cart`);
    } catch (err) {
      console.error('Failed to add item:', err);
      showToast('Failed to add item', 'error');
    }
  }

  async function handleCustomizationAdd(
    item: FoodItem,
    quantity: number,
    variations: SelectedVariation[],
    addons: SelectedAddon[],
    instructions: string
  ) {
    if (!profile || !restaurant) return;

    try {
      let cart = await getCart(profile.id);
      if (cart && cart.restaurant_id !== restaurant.id) {
        await clearCart(cart.id);
        await deleteCart(cart.id);
        cart = null;
      }
      if (!cart) {
        const cartId = await createCart(profile.id, restaurant.id);
        cart = { id: cartId } as never;
      }

      const basePrice = item.discounted_price ?? item.price;
      const variationTotal = variations.reduce((sum, v) => sum + (v.price_modifier || 0), 0);
      const addonTotal = addons.reduce((sum, a) => sum + a.price, 0);
      const unitPrice = basePrice + variationTotal + addonTotal;
      const totalPrice = unitPrice * quantity;

      await addToCart(cart.id, {
        food_item_id: item.id,
        name: item.name,
        image_url: item.image_url,
        base_price: item.price,
        quantity,
        selected_variations: variations,
        selected_addons: addons,
        special_instructions: instructions,
        unit_price: unitPrice,
        total_price: totalPrice,
      });

      setCartCount((prev) => prev + 1);
      setCustomizingItem(null);
      showToast(`${item.name} added to cart`);
    } catch (err) {
      console.error('Failed to add customized item:', err);
      showToast('Failed to add item', 'error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <RestaurantCardSkeleton />
      </div>
    );
  }

  if (!restaurant) return null;

  const isOpen = isRestaurantOpen(restaurant.opening_time, restaurant.closing_time);
  const filteredItems = menuSearch
    ? foodItems.filter((item) => item.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : foodItems;

  const itemsByCategory = activeCategory
    ? filteredItems.filter((item) => item.category_id === activeCategory)
    : filteredItems;

  return (
    <div className="pb-20 sm:pb-6">
      <div className="relative h-56 sm:h-80 overflow-hidden">
        <img
          src={restaurant.cover_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={() => navigate('/search')}
          className="absolute top-4 left-4 p-2 rounded-xl glass hover:bg-white transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-900" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 rounded-xl glass hover:bg-white transition-colors">
            <Share2 size={18} className="text-gray-900" />
          </button>
          <button className="p-2 rounded-xl glass hover:bg-white transition-colors">
            <Heart size={18} className="text-gray-900" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <img
              src={restaurant.logo_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'}
              alt={restaurant.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{restaurant.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{restaurant.cuisine || restaurant.category?.name}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <RatingStars rating={restaurant.rating} />
                <span className="text-sm text-gray-500">({restaurant.review_count} reviews)</span>
                <span className={`badge ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <InfoChip icon={Clock} label="Delivery" value={`${restaurant.estimated_delivery_time_min} min`} />
            <InfoChip icon={Bike} label="Fee" value={formatPrice(restaurant.delivery_fee)} />
            <InfoChip icon={Star} label="Min Order" value={formatPrice(restaurant.minimum_order)} />
          </div>

          {restaurant.description && (
            <p className="text-sm text-gray-600 mt-4 leading-relaxed">{restaurant.description}</p>
          )}

          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <MapPin size={16} className="text-[#ff5847]" />
            <span>{restaurant.formatted_address || restaurant.address}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Clock size={16} className="text-gray-400" />
            <span>{restaurant.opening_time} - {restaurant.closing_time}</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative max-w-md mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search in menu..."
              className="input pl-10"
            />
          </div>

          {categories.length > 0 && !menuSearch && (
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide sticky top-16 bg-[#f8f9fb] py-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`badge px-4 py-2 flex-shrink-0 transition-colors ${
                    activeCategory === cat.id ? 'bg-[#ff5847] text-white' : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {categories.map((cat) => {
            const catItems = filteredItems.filter((item) => item.category_id === cat.id);
            if (catItems.length === 0) return null;
            if (activeCategory && cat.id !== activeCategory && !menuSearch) return null;

            return (
              <div key={cat.id} className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-2">{cat.name}</h2>
                <div className="card divide-y divide-gray-100">
                  {catItems.map((item) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                      onAdd={() => handleAddItem(item)}
                      hasCustomization
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {itemsByCategory.length === 0 && !menuSearch && (
            <EmptyState title="No items available" description="This restaurant doesn't have any items in this category yet." />
          )}
        </div>

        {reviews.length > 0 && (
          <div className="mt-8">
            <h2 className="section-title mb-4">Reviews ({reviews.length})</h2>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    {review.profile?.avatar_url ? (
                      <img src={review.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#ff5847] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {(review.profile?.full_name || 'A').charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-gray-900">
                          {review.profile?.full_name || 'Anonymous'}
                        </p>
                        <ReviewStars rating={review.rating} size={14} />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                      {review.vendor_response && (
                        <div className="mt-2 p-2 rounded-lg bg-gray-50 text-sm">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5">Restaurant response:</p>
                          <p className="text-gray-600">{review.vendor_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-30">
          <button
            onClick={() => navigate('/cart')}
            className="btn-primary btn-lg w-full shadow-lg shadow-[#ff5847]/30"
          >
            <Bike size={20} />
            View Cart ({cartCount})
          </button>
        </div>
      )}

      {customizingItem && (
        <FoodCustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAdd={handleCustomizationAdd}
        />
      )}
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50">
      <Icon size={16} className="text-gray-500" />
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}
