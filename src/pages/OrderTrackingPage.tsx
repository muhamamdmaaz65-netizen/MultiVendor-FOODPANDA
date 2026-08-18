import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Check, Clock, Bike, MapPin, Phone, Star } from 'lucide-react';
import type { Order } from '@/types';
import { getOrderById, getOrderStatusHistory, addReview } from '@/services/orderService';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_FLOW } from '@/types';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { ReviewStars } from '@/components/ui/RatingStars';
import { Modal } from '@/components/ui/Modal';

export function OrderTrackingPage({ orderId }: { orderId: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    try {
      const o = await getOrderById(orderId);
      setOrder(o);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmitReview() {
    if (!profile || !order) return;
    try {
      await addReview({
        user_id: profile.id,
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        review_type: 'RESTAURANT',
        rating,
        comment,
      });
      showToast('Review submitted!');
      setReviewOpen(false);
    } catch (err) {
      showToast('Failed to submit review', 'error');
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-6"><div className="skeleton h-96" /></div>;
  }

  if (!order) {
    return <div className="max-w-3xl mx-auto px-4 py-6"><p>Order not found</p></div>;
  }

  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft size={18} /> Back to orders
      </button>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">{order.order_number}</h1>
            <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
          </div>
          <span className={`badge ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        </div>

        <div className="flex items-center gap-3">
          <img
            src={order.restaurant?.logo_url || order.restaurant?.cover_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'}
            alt={order.restaurant?.name || ''}
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div>
            <p className="font-bold text-gray-900">{order.restaurant?.name}</p>
            <p className="text-xs text-gray-500">{order.restaurant?.cuisine}</p>
          </div>
        </div>
      </div>

      {!isCancelled && (
        <div className="card p-5 mb-4">
          <h2 className="font-bold text-gray-900 mb-4">Order Tracking</h2>
          <div className="space-y-1">
            {ORDER_STATUS_FLOW.map((status, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted ? 'bg-[#ff5847] text-white' : 'bg-gray-100 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-[#ff5847]/20' : ''}`}>
                      {isCompleted ? <Check size={16} /> : <Clock size={16} />}
                    </div>
                    {index < ORDER_STATUS_FLOW.length - 1 && (
                      <div className={`w-0.5 h-8 ${index < currentStepIndex ? 'bg-[#ff5847]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className={`font-semibold text-sm ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {ORDER_STATUS_LABELS[status]}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[#ff5847] font-medium">In progress...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {order.rider && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#ff5847]/10 flex items-center justify-center">
            <Bike size={24} className="text-[#ff5847]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Your Rider</p>
            <p className="text-xs text-gray-500">Rating: {order.rider.rating} ★</p>
          </div>
          <button className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            <Phone size={18} className="text-gray-700" />
          </button>
        </div>
      )}

      <div className="card p-5 mb-4">
        <h2 className="font-bold text-gray-900 mb-3">Delivery Address</h2>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin size={16} className="text-[#ff5847] mt-0.5" />
          <div>
            <p>{order.delivery_address}</p>
            {order.delivery_instructions && (
              <p className="text-xs text-gray-400 mt-1">Instructions: {order.delivery_instructions}</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-bold text-gray-900 mb-3">Order Items</h2>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <img src={item.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-semibold">{item.quantity}x {item.name}</p>
                {item.selected_variations && item.selected_variations.length > 0 && (
                  <p className="text-xs text-gray-500">{item.selected_variations.map((v) => `${v.variation}: ${v.option}`).join(', ')}</p>
                )}
              </div>
              <span className="font-semibold">{formatPrice(item.total_price)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>{formatPrice(order.delivery_fee)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Service Fee</span><span>{formatPrice(order.service_fee)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax)}</span></div>
          {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100"><span>Total</span><span className="text-[#ff5847]">{formatPrice(order.total)}</span></div>
        </div>
      </div>

      {isDelivered && (
        <button onClick={() => setReviewOpen(true)} className="btn-outline btn-lg w-full">
          <Star size={18} /> Rate Your Experience
        </button>
      )}

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Rate Your Experience">
        <div className="space-y-4">
          <div>
            <p className="label text-center">How was your order?</p>
            <div className="flex justify-center mt-2">
              <ReviewStars rating={rating} size={32} interactive onChange={setRating} />
            </div>
          </div>
          <div>
            <label className="label">Your Review</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us about your experience..." className="input min-h-[100px] resize-none" />
          </div>
          <button onClick={handleSubmitReview} className="btn-primary btn-lg w-full">Submit Review</button>
        </div>
      </Modal>
    </div>
  );
}
