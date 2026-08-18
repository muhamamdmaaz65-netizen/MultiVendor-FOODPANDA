import { useEffect, useState, useCallback } from 'react';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { DollarSign, Users, Store, Bike, ShoppingBag, TrendingUp, Check, X, Star, Tag, Image, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Restaurant, Order, Profile, Review, Coupon, Banner } from '@/types';

export function AdminDashboard() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0, restaurants: 0, riders: 0, pendingVendors: 0 });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  const load = useCallback(async () => {
    try {
      const [rests, ords, usrs, revs, cpns, bnrs] = await Promise.all([
        supabase.from('restaurants').select('*, category:restaurant_categories(*)').order('created_at', { ascending: false }),
        supabase.from('orders').select('*, restaurant:restaurants(*), user:profiles(*)').order('created_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, profile:profiles(*), restaurant:restaurants(*)').order('created_at', { ascending: false }).limit(20),
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('banners').select('*').order('sort_order'),
      ]);

      setRestaurants((rests.data || []) as Restaurant[]);
      setOrders((ords.data || []) as Order[]);
      setUsers((usrs.data || []) as Profile[]);
      setReviews((revs.data || []) as Review[]);
      setCoupons((cpns.data || []) as Coupon[]);
      setBanners((bnrs.data || []) as Banner[]);

      const totalRevenue = (ords.data || []).reduce((s: number, o: any) => s + Number(o.total), 0);
      setStats({
        revenue: totalRevenue,
        orders: ords.data?.length || 0,
        customers: (usrs.data || []).filter((u: any) => u.role === 'CUSTOMER').length,
        restaurants: (rests.data || []).filter((r: any) => r.status === 'APPROVED').length,
        riders: (usrs.data || []).filter((u: any) => u.role === 'RIDER').length,
        pendingVendors: (rests.data || []).filter((r: any) => r.status === 'PENDING').length,
      });
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRestaurantStatus(restId: string, status: string) {
    try {
      await supabase.from('restaurants').update({ status }).eq('id', restId);
      showToast(`Restaurant ${status.toLowerCase()}`);
      load();
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  async function handleToggleCoupon(couponId: string, current: boolean) {
    try {
      await supabase.from('coupons').update({ is_active: !current }).eq('id', couponId);
      load();
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  async function handleHideReview(reviewId: string, current: boolean) {
    try {
      await supabase.from('reviews').update({ is_hidden: !current }).eq('id', reviewId);
      load();
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  if (!profile) { navigate('/signin'); return null; }
  if (profile.role !== 'ADMIN') {
    return <div className="max-w-3xl mx-auto px-4 py-6"><EmptyState title="Access Denied" description="You need admin access to view this page." /></div>;
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-6"><div className="skeleton h-96" /></div>;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'banners', label: 'Banners', icon: Image },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`badge px-4 py-2 flex-shrink-0 ${activeTab === item.id ? 'bg-[#ff5847] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
            <item.icon size={14} className="mr-1" /> {item.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={DollarSign} label="Revenue" value={formatPrice(stats.revenue)} color="text-green-600" bg="bg-green-50" />
            <StatCard icon={ShoppingBag} label="Orders" value={stats.orders.toString()} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={Users} label="Customers" value={stats.customers.toString()} color="text-purple-600" bg="bg-purple-50" />
            <StatCard icon={Store} label="Restaurants" value={stats.restaurants.toString()} color="text-orange-600" bg="bg-orange-50" />
            <StatCard icon={Bike} label="Riders" value={stats.riders.toString()} color="text-cyan-600" bg="bg-cyan-50" />
            <StatCard icon={TrendingUp} label="Pending" value={stats.pendingVendors.toString()} color="text-amber-600" bg="bg-amber-50" />
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Pending Restaurant Approvals</h2>
            {restaurants.filter(r => r.status === 'PENDING').length === 0 ? (
              <p className="text-sm text-gray-500">No pending approvals.</p>
            ) : (
              <div className="space-y-2">
                {restaurants.filter(r => r.status === 'PENDING').map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50">
                    <div className="flex items-center gap-3">
                      <img src={r.logo_url || r.cover_url || ''} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold text-sm">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.cuisine}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRestaurantStatus(r.id, 'APPROVED')} className="btn-primary btn-sm"><Check size={14} /> Approve</button>
                      <button onClick={() => handleRestaurantStatus(r.id, 'REJECTED')} className="btn-outline btn-sm"><X size={14} /> Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'restaurants' && (
        <div className="space-y-2">
          {restaurants.map((r) => (
            <div key={r.id} className="card p-3 flex items-center gap-3">
              <img src={r.logo_url || r.cover_url || ''} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-gray-500">{r.cuisine} · {r.city}</p>
              </div>
              <select
                value={r.status}
                onChange={(e) => handleRestaurantStatus(r.id, e.target.value)}
                className="text-xs font-semibold rounded-lg border border-gray-200 px-2 py-1.5"
              >
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 ? <EmptyState title="No orders" /> : orders.map((o) => (
            <div key={o.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{o.order_number}</p>
                <p className="text-xs text-gray-500">{o.restaurant?.name} · {formatDateTime(o.created_at)}</p>
              </div>
              <span className="font-bold text-sm">{formatPrice(Number(o.total))}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card p-3 flex items-center gap-3">
              {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> :
                <div className="w-10 h-10 rounded-full bg-[#ff5847] flex items-center justify-center"><span className="text-white font-bold text-sm">{u.full_name.charAt(0)}</span></div>}
              <div className="flex-1">
                <p className="font-semibold text-sm">{u.full_name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <span className="badge bg-gray-100 text-gray-700">{u.role}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-2">
          {reviews.length === 0 ? <EmptyState title="No reviews" /> : reviews.map((r) => (
            <div key={r.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.profile?.full_name || 'User'}</span>
                  <span className="text-xs text-amber-500">{'★'.repeat(r.rating)}</span>
                </div>
                <button onClick={() => handleHideReview(r.id, r.is_hidden)} className={`badge ${r.is_hidden ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {r.is_hidden ? 'Hidden' : 'Visible'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{r.comment}</p>
              {r.restaurant && <p className="text-xs text-gray-400 mt-1">on {r.restaurant.name}</p>}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="card p-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{c.code}</p>
                <p className="text-xs text-gray-500">{c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% off` : formatPrice(c.discount_value)} off · {c.used_count} used</p>
              </div>
              <button onClick={() => handleToggleCoupon(c.id, c.is_active)} className={`badge ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="space-y-2">
          {banners.map((b) => (
            <div key={b.id} className="card p-3 flex items-center gap-3">
              <img src={b.image_url} alt="" className="w-16 h-12 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-semibold text-sm">{b.title}</p>
                <p className="text-xs text-gray-500">{b.subtitle}</p>
              </div>
              <span className={`badge ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{b.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        <Icon size={20} className={color} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-extrabold text-lg text-gray-900">{value}</p>
    </div>
  );
}
