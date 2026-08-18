import { useEffect, useState, useCallback } from 'react';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Bike, DollarSign, Package, Clock, CheckCircle, Power, MapPin, Phone, Navigation } from 'lucide-react';
import type { Rider, Order } from '@/types';
import { supabase } from '@/lib/supabase';
import { updateOrderStatus } from '@/services/cartService';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatPrice, formatDateTime, timeAgo } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function RiderDashboard() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [rider, setRider] = useState<Rider | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const { data: r } = await supabase
        .from('riders')
        .select('*, profile:profiles(*)')
        .eq('user_id', profile.id)
        .maybeSingle();
      setRider(r as Rider | null);

      if (r) {
        const { data: ords } = await supabase
          .from('orders')
          .select('*, restaurant:restaurants(*), items:order_items(*)')
          .eq('rider_id', r.id)
          .order('created_at', { ascending: false });
        setOrders((ords || []) as Order[]);
      }
    } catch (err) {
      console.error('Failed to load rider data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus() {
    if (!rider) return;
    const newStatus = rider.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await supabase.from('riders').update({ status: newStatus }).eq('id', rider.id);
      load();
      showToast(`You are now ${newStatus.toLowerCase()}`);
    } catch {
      showToast('Failed to update status', 'error');
    }
  }

  async function handlePickup(orderId: string) {
    if (!profile) return;
    await updateOrderStatus(orderId, 'PICKED_UP', profile.id, 'Rider picked up order');
    showToast('Order picked up!');
    load();
  }

  async function handleDeliver(orderId: string) {
    if (!profile) return;
    await updateOrderStatus(orderId, 'DELIVERED', profile.id, 'Order delivered');
    showToast('Order delivered!');
    load();
  }

  if (!profile) { navigate('/signin'); return null; }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-6"><div className="skeleton h-96" /></div>;

  if (!rider) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EmptyState
          icon={<Bike size={32} className="text-gray-400" />}
          title="No rider profile yet"
          description="Register as a rider to start delivering."
          action={<Link to="/rider/register" className="btn-primary btn-md">Register as Rider</Link>}
        />
      </div>
    );
  }

  const activeOrders = orders.filter(o => ['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status));
  const completedToday = orders.filter(o => o.status === 'DELIVERED' && new Date(o.delivered_at || o.created_at).toDateString() === new Date().toDateString());
  const todayEarnings = completedToday.length * 3.50;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#ff5847]/10 flex items-center justify-center">
            <Bike size={24} className="text-[#ff5847]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Rider Dashboard</h1>
            <p className="text-sm text-gray-500">{profile.full_name}</p>
          </div>
        </div>
        <button onClick={toggleStatus} className={`btn-md ${rider.status === 'ONLINE' ? 'btn-primary' : 'btn-outline'}`}>
          <Power size={16} /> {rider.status === 'ONLINE' ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Today's Earnings" value={formatPrice(todayEarnings)} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={Package} label="Today's Deliveries" value={completedToday.length.toString()} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Clock} label="Active" value={activeOrders.length.toString()} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={CheckCircle} label="Total" value={rider.total_deliveries.toString()} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-gray-900">Active Deliveries</h2>
        {activeOrders.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-500">
            {rider.status === 'ONLINE' ? 'Waiting for delivery assignments...' : 'Go online to start receiving deliveries.'}
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-sm">{order.order_number}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                </div>
                <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 mb-1">PICKUP</p>
                  <p className="text-sm font-bold">{order.restaurant?.name}</p>
                  <p className="text-xs text-gray-500">{order.restaurant?.address}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 mb-1">DELIVERY</p>
                  <p className="text-sm font-bold">{order.delivery_address}</p>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {order.items?.map((item) => (
                  <p key={item.id} className="text-sm text-gray-600">{item.quantity}x {item.name}</p>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold">{formatPrice(Number(order.total))}</span>
                <div className="flex gap-2">
                  {order.status === 'RIDER_ASSIGNED' && (
                    <button onClick={() => handlePickup(order.id)} className="btn-primary btn-sm">
                      <Navigation size={14} /> Confirm Pickup
                    </button>
                  )}
                  {(order.status === 'PICKED_UP' || order.status === 'OUT_FOR_DELIVERY') && (
                    <button onClick={() => handleDeliver(order.id)} className="btn-primary btn-sm">
                      <CheckCircle size={14} /> Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-bold text-gray-900 mb-3">Delivery History</h2>
        {orders.filter(o => o.status === 'DELIVERED').length === 0 ? (
          <p className="text-sm text-gray-500">No completed deliveries yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.filter(o => o.status === 'DELIVERED').slice(0, 10).map((order) => (
              <div key={order.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{order.order_number}</p>
                  <p className="text-xs text-gray-500">{timeAgo(order.delivered_at || order.created_at)}</p>
                </div>
                <span className="font-bold text-sm text-green-600">+{formatPrice(3.50)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
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
