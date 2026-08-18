import { Heart, Clock, Bike, Star, MapPin } from 'lucide-react';
import type { Restaurant } from '@/types';
import { Link } from '@/contexts/RouterContext';
import { formatPrice, formatDistance, calculateDistance } from '@/lib/utils';
import { RatingStars } from '@/components/ui/RatingStars';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toggleFavorite } from '@/services/orderService';

export function RestaurantCard({
  restaurant,
  userLat,
  userLng,
}: {
  restaurant: Restaurant;
  userLat?: number;
  userLng?: number;
}) {
  const { profile } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const distance =
    userLat && userLng && restaurant.latitude && restaurant.longitude
      ? calculateDistance(userLat, userLng, restaurant.latitude, restaurant.longitude)
      : null;

  const hasDiscount = restaurant.cover_url?.includes('discount') || false;

  async function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!profile) return;
    const result = await toggleFavorite(profile.id, restaurant.id);
    setFavorited(result);
  }

  return (
    <Link to={`/restaurant/${restaurant.slug}`} className="block group">
      <div className="card overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <div className="relative h-44 overflow-hidden">
          <img
            src={restaurant.cover_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600'}
            alt={restaurant.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {hasDiscount && (
            <div className="absolute top-3 left-3 badge bg-[#ff5847] text-white">
              20% OFF
            </div>
          )}

          {profile && (
            <button
              onClick={handleFavorite}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
            >
              <Heart
                size={16}
                className={favorited ? 'fill-[#ff5847] text-[#ff5847]' : 'text-gray-600'}
              />
            </button>
          )}

          {!restaurant.is_open && (
            <div className="absolute bottom-3 left-3 badge bg-gray-900/80 text-white">
              Closed
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
              {restaurant.name}
            </h3>
            <RatingStars rating={restaurant.rating} size={12} />
          </div>

          <p className="text-xs text-gray-500 line-clamp-1">
            {restaurant.cuisine || restaurant.category?.name || 'Restaurant'}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {restaurant.estimated_delivery_time_min} min
            </span>
            <span className="flex items-center gap-1">
              <Bike size={12} />
              {formatPrice(restaurant.delivery_fee)}
            </span>
            {distance !== null && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {formatDistance(distance)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
