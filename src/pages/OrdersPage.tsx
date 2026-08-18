import { useEffect, useState, useCallback } from 'react';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, ChevronRight } from 'lucide-react';
import type { Order } from '@/types';
import { getOrders } from '@/services/orderService';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import { formatPrice as fmtPrice, formatDateTime, timeAgo } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function OrdersPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getOrders(profile.id);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EmptyState title="Sign in to view orders" action={<Link to="/signin" className="btn-primary btn-md">Sign In</Link>} />
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">{Array.from({length: 3}).map((_,i) => <div key={i} className="skeleton h-24" />)}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EmptyState
          icon={<ClipboardList size={32} className="text-gray-400" />}
          title="No orders yet"
          description="When you place an order, it will appear here."
          action={<Link to="/search" className="btn-primary btn-md">Start Ordering</Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Your Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => navigate(`/orders/${order.id}`)}
            className="card p-4 w-full text-left hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <img
              src={order.restaurant?.logo_url || order.restaurant?.cover_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'}
              alt={order.restaurant?.name || ''}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-gray-900 truncate">{order.restaurant?.name || 'Restaurant'}</h3>
                <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{order.order_number} · {formatDateTime(order.created_at)}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                <p className="font-bold text-[#ff5847]">{fmtPrice(order.total)}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
