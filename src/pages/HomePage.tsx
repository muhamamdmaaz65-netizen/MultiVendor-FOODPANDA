import { useEffect, useState } from 'react';
import { Link } from '@/contexts/RouterContext';
import { useLocation } from '@/contexts/LocationContext';
import { Search, Clock, Bike, Star, ArrowRight, Store, Bike as BikeIcon, ChevronRight } from 'lucide-react';
import type { Restaurant, RestaurantCategory, Banner, Promotion, FoodItem } from '@/types';
import { getRestaurants, getRestaurantCategories, getBanners, getPromotions, searchFoodItems } from '@/services/restaurantService';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardSkeleton, CategorySkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/utils';

export function HomePage() {
  const { selectedLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [popularFood, setPopularFood] = useState<(FoodItem & { restaurant?: Restaurant })[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [rests, cats, banns, promos, food] = await Promise.all([
          getRestaurants({ limit: 12 }),
          getRestaurantCategories(),
          getBanners(),
          getPromotions(),
          searchFoodItems('', 10),
        ]);
        setRestaurants(rests);
        setCategories(cats);
        setBanners(banns);
        setPromotions(promos);
        setPopularFood(food);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const featuredRestaurants = restaurants.filter((r) => r.featured).slice(0, 6);
  const popularRestaurants = restaurants.slice(0, 6);
  const nearbyRestaurants = restaurants.slice(0, 6);

  return (
    <div className="pb-20 sm:pb-0">
      <HeroSection banners={banners} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <CategorySection categories={categories} loading={loading} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-12">
        {promotions.length > 0 && <PromotionsSection promotions={promotions} />}

        <Section
          title="Popular Restaurants"
          subtitle="Most loved by FoodHub customers"
          href="/search?sort=popular"
        >
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {popularRestaurants.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  userLat={selectedLocation.lat}
                  userLng={selectedLocation.lng}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Featured Restaurants"
          subtitle="Handpicked dining experiences"
          href="/search?featured=true"
        >
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredRestaurants.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  userLat={selectedLocation.lat}
                  userLng={selectedLocation.lng}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Popular Food Items" subtitle="Trending dishes right now">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularFood.map((item) => (
              <Link
                key={item.id}
                to={`/restaurant/${item.restaurant?.slug || ''}`}
                className="card p-3 flex gap-3 hover:shadow-md transition-shadow"
              >
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'}
                  alt={item.name}
                  loading="lazy"
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{item.restaurant?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold">{item.rating.toFixed(1)}</span>
                    <span className="font-bold text-sm text-[#ff5847] ml-auto">
                      {formatPrice(item.discounted_price ?? item.price)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        <Section
          title="Restaurants Near You"
          subtitle={`Top picks in ${selectedLocation.label}`}
          href="/search"
        >
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nearbyRestaurants.map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  userLat={selectedLocation.lat}
                  userLng={selectedLocation.lng}
                />
              ))}
            </div>
          )}
        </Section>

        <HowItWorks />

        <PartnerCTA />
      </div>
    </div>
  );
}

function HeroSection({ banners }: { banners: Banner[] }) {
  const banner = banners[0];
  return (
    <section className="relative h-[320px] sm:h-[400px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff5847] via-[#e04335] to-[#c9362a]" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600')] bg-cover bg-center opacity-20" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 h-full flex flex-col justify-center">
        <div className="max-w-2xl text-white">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-3 text-balance">
            {banner?.title || 'What are you craving today?'}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-6">
            {banner?.subtitle || 'Order from the best restaurants in your city, delivered fast.'}
          </p>
          <Link to="/search" className="btn-secondary btn-lg inline-flex">
            <Search size={18} /> Explore Restaurants
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategorySection({
  categories,
  loading,
}: {
  categories: RestaurantCategory[];
  loading: boolean;
}) {
  return (
    <div className="card p-4 sm:p-6">
      <h2 className="section-title mb-4">Browse by Category</h2>
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <span className="text-2xl font-extrabold text-[#ff5847]">
                    {cat.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center max-w-[80px]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {href && (
          <Link to={href} className="flex items-center gap-1 text-sm font-semibold text-[#ff5847] hover:gap-2 transition-all">
            See all <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function PromotionsSection({ promotions }: { promotions: Promotion[] }) {
  return (
    <section>
      <h2 className="section-title mb-4">Special Offers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((promo) => (
          <Link
            key={promo.id}
            to={promo.restaurant_id ? `/restaurant/${promo.restaurant_id}` : '/search'}
            className="relative h-32 rounded-2xl overflow-hidden group"
          >
            <img
              src={promo.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'}
              alt={promo.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <span className="badge bg-[#ff5847] mb-1">{promo.discount_text}</span>
              <h3 className="font-bold text-lg">{promo.title}</h3>
              <p className="text-xs text-white/80 line-clamp-1">{promo.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Search, title: 'Discover', desc: 'Browse restaurants and menus near you' },
    { icon: Store, title: 'Order', desc: 'Add items to cart and place your order' },
    { icon: BikeIcon, title: 'Track', desc: 'Follow your delivery in real-time' },
    { icon: Star, title: 'Enjoy', desc: 'Rate your experience and order again' },
  ];

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-10">
      <h2 className="section-title text-center mb-8">How FoodHub Works</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, i) => (
          <div key={i} className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#ff5847]/10 flex items-center justify-center mx-auto mb-3">
              <step.icon size={28} className="text-[#ff5847]" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
            <p className="text-sm text-gray-500">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PartnerCTA() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="relative h-48 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 p-6 flex flex-col justify-center">
        <Store size={32} className="text-[#ff5847] mb-2" />
        <h3 className="text-xl font-bold text-white mb-1">Become a Restaurant Partner</h3>
        <p className="text-sm text-gray-400 mb-3">Grow your business with FoodHub</p>
        <Link to="/signup?role=VENDOR" className="btn-primary btn-sm w-fit">
          Get Started <ArrowRight size={16} />
        </Link>
      </div>
      <div className="relative h-48 rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 p-6 flex flex-col justify-center">
        <BikeIcon size={32} className="text-[#ff5847] mb-2" />
        <h3 className="text-xl font-bold text-white mb-1">Become a Delivery Rider</h3>
        <p className="text-sm text-gray-400 mb-3">Earn on your own schedule</p>
        <Link to="/signup?role=RIDER" className="btn-primary btn-sm w-fit">
          Get Started <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
