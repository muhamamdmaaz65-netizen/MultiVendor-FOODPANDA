import { useEffect, useState, useCallback } from 'react';
import { useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, MapPin, CreditCard, Banknote, Check, Tag } from 'lucide-react';
import type { Cart, Address, PaymentMethod } from '@/types';
import { getCart, deleteCart, placeOrder } from '@/services/cartService';
import { getAddresses } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function CheckoutPage() {
  const { profile } = useAuth();
  const { navigate, path } = useRouter();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const urlParams = new URLSearchParams(path.split('?')[1] || '');
  const urlDiscount = parseFloat(urlParams.get('discount') || '0');

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [c, addrs] = await Promise.all([getCart(profile.id), getAddresses(profile.id)]);
      setCart(c);
      setAddresses(addrs);
      setDiscount(urlDiscount);
      if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
    } catch (err) {
      console.error('Failed to load checkout data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile, urlDiscount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePlaceOrder() {
    if (!profile || !cart) return;
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      showToast('Please select a delivery address', 'error');
      return;
    }
    setPlacing(true);
    try {
      const serviceFee = cart.subtotal * 0.05;
      const tax = cart.subtotal * 0.08;
      const total = cart.subtotal + cart.delivery_fee + serviceFee + tax - discount;

      const { orderId, orderNumber } = await placeOrder({
        user_id: profile.id,
        restaurant_id: cart.restaurant_id,
        subtotal: cart.subtotal,
        delivery_fee: cart.delivery_fee,
        service_fee: serviceFee,
        tax,
        discount,
        total,
        delivery_address: selectedAddress.formatted_address || selectedAddress.address_line1,
        delivery_latitude: selectedAddress.latitude || undefined,
        delivery_longitude: selectedAddress.longitude || undefined,
        delivery_instructions: deliveryInstructions,
        payment_method: paymentMethod,
        estimated_delivery_time: cart.restaurant?.estimated_delivery_time_min || 30,
        items: (cart.items || []).map((item) => ({
          food_item_id: item.food_item_id,
          name: item.name,
          image_url: item.image_url,
          base_price: item.base_price,
          quantity: item.quantity,
          selected_variations: item.selected_variations,
          selected_addons: item.selected_addons,
          special_instructions: item.special_instructions,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      });

      await deleteCart(cart.id);
      showToast('Order placed successfully!');
      navigate(`/orders/${orderId}`);
    } catch (err) {
      console.error('Failed to place order:', err);
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      setPlacing(false);
    }
  }

  if (!profile) {
    navigate('/signin');
    return null;
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-6"><div className="skeleton h-96" /></div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <EmptyState title="Your cart is empty" description="Add items to your cart before checking out." />
      </div>
    );
  }

  const serviceFee = cart.subtotal * 0.05;
  const tax = cart.subtotal * 0.08;
  const total = cart.subtotal + cart.delivery_fee + serviceFee + tax - discount;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
      <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft size={18} /> Back to cart
      </button>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Checkout</h1>

      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-[#ff5847]" /> Delivery Address
          </h2>
          {addresses.length === 0 ? (
            <p className="text-sm text-gray-500">No addresses found. Please add one in your profile.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    selectedAddressId === addr.id ? 'border-[#ff5847] bg-[#ff5847]/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedAddressId === addr.id ? 'border-[#ff5847]' : 'border-gray-300'
                    }`}>
                      {selectedAddressId === addr.id && <div className="w-2.5 h-2.5 rounded-full bg-[#ff5847]" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{addr.label}</p>
                      <p className="text-sm text-gray-500">{addr.address_line1}, {addr.city}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Delivery Instructions</h2>
          <textarea
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="e.g. Leave at the door, ring the bell, apartment 4B..."
            className="input min-h-[80px] resize-none"
          />
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Payment Method</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'CASH_ON_DELIVERY' as PaymentMethod, label: 'Cash on Delivery', icon: Banknote },
              { value: 'CARD' as PaymentMethod, label: 'Credit/Debit Card', icon: CreditCard },
            ].map((method) => (
              <button
                key={method.value}
                onClick={() => setPaymentMethod(method.value)}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === method.value ? 'border-[#ff5847] bg-[#ff5847]/5' : 'border-gray-200'
                }`}
              >
                <method.icon size={24} className={paymentMethod === method.value ? 'text-[#ff5847]' : 'text-gray-400'} />
                <span className="text-xs font-semibold">{method.label}</span>
              </button>
            ))}
          </div>
          {paymentMethod === 'CARD' && (
            <p className="text-xs text-gray-400 mt-2">Online payment integration coming soon. Use Cash on Delivery for now.</p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            {cart.items?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span className="font-semibold">{formatPrice(item.total_price)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>{formatPrice(cart.delivery_fee)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Service Fee</span><span>{formatPrice(serviceFee)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(tax)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(discount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
              <span>Total</span><span className="text-[#ff5847]">{formatPrice(total)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-30">
        <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary btn-lg w-full shadow-lg shadow-[#ff5847]/30">
          {placing ? 'Placing order...' : <>Place Order · {formatPrice(total)}</>}
        </button>
      </div>
    </div>
  );
}
