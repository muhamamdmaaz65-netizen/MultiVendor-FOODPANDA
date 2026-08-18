import { MapPin, Search, Bell, User, ShoppingBag } from 'lucide-react';
import { Link, useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Header() {
  const { profile, signOut } = useAuth();
  const { selectedLocation } = useLocation();
  const { navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count || 0));
  }, [profile]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#ff5847] flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">F</span>
              </div>
              <span className="font-extrabold text-xl text-gray-900 hidden sm:block">
                FoodHub
              </span>
            </Link>
          </div>

          <button
            className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            onClick={() => navigate('/location')}
          >
            <MapPin size={16} className="text-[#ff5847]" />
            <span className="font-medium truncate max-w-[180px]">
              {selectedLocation.label}
            </span>
          </button>

          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for restaurants or food..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-900 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-[#ff5847]/10 focus:outline-none transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Bell size={20} className="text-gray-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#ff5847] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {profile.role === 'CUSTOMER' && (
                  <Link
                    to="/cart"
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ShoppingBag size={20} className="text-gray-700" />
                  </Link>
                )}

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#ff5847] flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {profile.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 card p-2 z-20 animate-in scale-in">
                        <div className="px-3 py-2 border-b border-gray-100 mb-1">
                          <p className="font-semibold text-sm text-gray-900">{profile.full_name}</p>
                          <p className="text-xs text-gray-500">{profile.email}</p>
                          <p className="text-xs text-[#ff5847] font-medium mt-1">{profile.role}</p>
                        </div>
                        {profile.role === 'CUSTOMER' && (
                          <>
                            <MenuItem href="/orders" label="My Orders" onClick={() => setMenuOpen(false)} />
                            <MenuItem href="/favorites" label="Favorites" onClick={() => setMenuOpen(false)} />
                            <MenuItem href="/addresses" label="Addresses" onClick={() => setMenuOpen(false)} />
                          </>
                        )}
                        {profile.role === 'VENDOR' && (
                          <MenuItem href="/vendor" label="Vendor Dashboard" onClick={() => setMenuOpen(false)} />
                        )}
                        {profile.role === 'RIDER' && (
                          <MenuItem href="/rider" label="Rider Dashboard" onClick={() => setMenuOpen(false)} />
                        )}
                        {profile.role === 'ADMIN' && (
                          <MenuItem href="/admin" label="Admin Dashboard" onClick={() => setMenuOpen(false)} />
                        )}
                        <MenuItem href="/profile" label="Profile" onClick={() => setMenuOpen(false)} />
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            signOut();
                            navigate('/');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                        >
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/signin" className="btn-ghost btn-sm">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary btn-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="sm:hidden pb-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for food..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm focus:bg-white focus:ring-2 focus:ring-[#ff5847]/10 focus:outline-none"
            />
          </div>
        </form>
      </div>
    </header>
  );
}

function MenuItem({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link to={href} onClick={onClick} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium">
      {label}
    </Link>
  );
}
