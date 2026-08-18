import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, Link } from '@/contexts/RouterContext';
import { Heart } from 'lucide-react';
import type { Favorite } from '@/types';
import { getFavorites } from '@/services/orderService';
import { RestaurantCard } from '@/components/RestaurantCard';
import { EmptyState } from '@/components/ui/EmptyState';

export function FavoritesPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getFavorites(profile.id);
      setFavorites(data);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (!profile) { navigate('/signin'); return null; }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-6"><div className="skeleton h-64" /></div>;

  if (favorites.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EmptyState
          icon={<Heart size={32} className="text-gray-400" />}
          title="No favorites yet"
          description="Tap the heart icon on restaurants to save them here."
          action={<Link to="/search" className="btn-primary btn-md">Browse Restaurants</Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Your Favorites</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {favorites.map((fav) => (
          <RestaurantCard key={fav.id} restaurant={fav.restaurant as never} />
        ))}
      </div>
    </div>
  );
}
