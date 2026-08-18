import { useEffect, useState, useCallback } from 'react';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Store, Plus, Clock, DollarSign, ShoppingBag, TrendingUp, UtensilsCrossed, Settings, ChevronRight, Check, X } from 'lucide-react';
import type { Restaurant, Order, FoodItem, FoodCategory } from '@/types';
import { supabase } from '@/lib/supabase';
import { getRestaurantBySlug, getFoodItems, getFoodCategories } from '@/services/restaurantService';
import { updateOrderStatus } from '@/services/cartService';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

export function VendorDashboard() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', image_url: '', category_id: '' });
  const [categories, setCategories] = useState<FoodCategory[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*, category:restaurant_categories(*)')
        .eq('owner_id', profile.id)
        .maybeSingle();
      setRestaurant(rest as Restaurant | null);

      if (rest) {
        const [orderData, foodData, catData] = await Promise.all([
          supabase.from('orders').select('*, items:order_items(*)').eq('restaurant_id', rest.id).order('created_at', { ascending: false }),
          getFoodItems(rest.id),
          getFoodCategories(rest.id),
        ]);
        setOrders((orderData.data || []) as Order[]);
        setFoodItems(foodData);
        setCategories(catData);
      }
    } catch (err) {
      console.error('Failed to load vendor data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusUpdate(orderId: string, status: string) {
    if (!profile) return;
    try {
      await updateOrderStatus(orderId, status, profile.id);
      showToast(`Order ${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]}`);
      load();
    } catch {
      showToast('Failed to update order', 'error');
    }
  }

  async function handleAddItem() {
    if (!restaurant || !newItem.name || !newItem.price) return;
    try {
      const { error } = await supabase.from('food_items').insert({
        restaurant_id: restaurant.id,
        category_id: newItem.category_id || null,
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        image_url: newItem.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
        is_available: true,
      });
      if (error) throw error;
      showToast('Item added!');
      setAddingItem(false);
      setNewItem({ name: '', description: '', price: '', image_url: '', category_id: '' });
      load();
    } catch {
      showToast('Failed to add item', 'error');
    }
  }

  async function toggleAvailability(item: FoodItem) {
    try {
      await supabase.from('food_items').update({ is_available: !item.is_available }).eq('id', item.id);
      load();
    } catch {
      showToast('Failed to update', 'error');
    }
  }

  if (!profile) {
    navigate('/signin');
    return null;
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-6"><div className="skeleton h-96" /></div>;
  }

  if (!restaurant) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EmptyState
          icon={<Store size={32} className="text-gray-400" />}
          title="No restaurant yet"
          description="Register your restaurant to start receiving orders."
          action={<Link to="/vendor/register" className="btn-primary btn-md">Register Restaurant</Link>}
        />
      </div>
    );
  }

  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const pendingOrders = orders.filter(o => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const cancelledOrders = orders.filter(o => ['CANCELLED', 'REJECTED'].includes(o.status));
  const todaySales = todayOrders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrderValue = completedOrders.length > 0 ? completedOrders.reduce((s, o) => s + Number(o.total), 0) / completedOrders.length : 0;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <img src={restaurant.logo_url || restaurant.cover_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'} alt={restaurant.name} className="w-12 h-12 rounded-xl object-cover" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{restaurant.name}</h1>
          <span className={`badge ${restaurant.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{restaurant.status}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`badge px-4 py-2 flex-shrink-0 ${activeTab === item.id ? 'bg-[#ff5847] text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
            <item.icon size={14} className="mr-1" /> {item.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} label="Today's Sales" value={formatPrice(todaySales)} color="text-green-600" bg="bg-green-50" />
            <StatCard icon={ShoppingBag} label="Orders Today" value={todayOrders.length.toString()} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={Clock} label="Pending" value={pendingOrders.length.toString()} color="text-amber-600" bg="bg-amber-50" />
            <StatCard icon={TrendingUp} label="Avg Order" value={formatPrice(avgOrderValue)} color="text-purple-600" bg="bg-purple-50" />
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-semibold text-sm">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                      <span className="font-bold text-sm">{formatPrice(Number(order.total))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <EmptyState icon={<ShoppingBag size={32} className="text-gray-400" />} title="No orders yet" />
          ) : (
            orders.map((order) => (
              <div key={order.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{order.order_number}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                  </div>
                  <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {order.items?.map((item) => (
                    <p key={item.id} className="text-sm text-gray-600">{item.quantity}x {item.name}</p>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{formatPrice(Number(order.total))}</span>
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')} className="btn-primary btn-sm"><Check size={14} /> Accept</button>
                        <button onClick={() => handleStatusUpdate(order.id, 'REJECTED')} className="btn-outline btn-sm"><X size={14} /> Reject</button>
                      </>
                    )}
                    {order.status === 'CONFIRMED' && <button onClick={() => handleStatusUpdate(order.id, 'PREPARING')} className="btn-primary btn-sm">Start Preparing</button>}
                    {order.status === 'PREPARING' && <button onClick={() => handleStatusUpdate(order.id, 'READY_FOR_PICKUP')} className="btn-primary btn-sm">Ready for Pickup</button>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'menu' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Menu Items ({foodItems.length})</h2>
            <button onClick={() => setAddingItem(true)} className="btn-primary btn-sm"><Plus size={16} /> Add Item</button>
          </div>
          <div className="space-y-2">
            {foodItems.map((item) => (
              <div key={item.id} className="card p-3 flex items-center gap-3">
                <img src={item.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatPrice(item.price)}</p>
                </div>
                <button onClick={() => toggleAvailability(item)} className={`badge ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Restaurant Settings</h2>
          <div><label className="label">Restaurant Name</label><input className="input" defaultValue={restaurant.name} /></div>
          <div><label className="label">Description</label><textarea className="input" defaultValue={restaurant.description} /></div>
          <div><label className="label">Delivery Fee</label><input className="input" type="number" defaultValue={restaurant.delivery_fee} /></div>
          <div><label className="label">Minimum Order</label><input className="input" type="number" defaultValue={restaurant.minimum_order} /></div>
          <button className="btn-primary btn-md">Save Changes</button>
        </div>
      )}

      <Modal open={addingItem} onClose={() => setAddingItem(false)} title="Add Menu Item">
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
          <div><label className="label">Description</label><textarea className="input" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
          <div><label className="label">Price</label><input className="input" type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
          <div><label className="label">Image URL</label><input className="input" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} /></div>
          <div><label className="label">Category</label>
            <select className="input" value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button onClick={handleAddItem} className="btn-primary btn-lg w-full">Add Item</button>
        </div>
      </Modal>
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
