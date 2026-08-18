import { useEffect, useState, useCallback } from 'react';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import type { Cart, CartItem } from '@/types';
import { getCart, updateCartItemQuantity, removeCartItem, validateCoupon, deleteCart } from '@/services/cartService';
import { formatPrice } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function CartPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState('');

  const loadCart = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const c = await getCart(profile.id);
      setCart(c);
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  async function handleQuantityChange(itemId: string, quantity: number) {
    try {
      await updateCartItemQuantity(itemId, quantity);
      loadCart();
    } catch (err) {
      showToast('Failed to update quantity', 'error');
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await removeCartItem(itemId);
      loadCart();
      showToast('Item removed');
    } catch (err) {
      showToast('Failed to remove item', 'error');
    }
  }

  async function handleClearCart() {
    if (!cart) return;
    try {
      await deleteCart(cart.id);
      setCart(null);
      showToast('Cart cleared');
    } catch (err) {
      showToast('Failed to clear cart', 'error');
    }
  }

  async function handleApplyCoupon() {
    if (!cart || !couponCode.trim()) return;
    setCouponError('');
    try {
      const result = await validateCoupon(couponCode, cart.subtotal);
      if (result.valid && result.coupon) {
        setDiscount(result.discount);
        setAppliedCoupon(result.coupon.id);
        showToast(`Coupon applied: ${formatPrice(result.discount)} off!`);
      } else {
        setCouponError(result.error || 'Invalid coupon');
        setDiscount(0);
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('Failed to validate coupon');
    }
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <EmptyState
          icon={<ShoppingBag size={32} className="text-gray-400" />}
          title="Sign in to view your cart"
          action={<Link to="/signin" className="btn-primary btn-md">Sign In</Link>}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-6"><div className="skeleton h-96" /></div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <EmptyState
          icon={<ShoppingBag size={32} className="text-gray-400" />}
          title="Your cart is empty"
          description="Browse restaurants and add items to your cart to get started."
          action={<Link to="/search" className="btn-primary btn-md">Browse Restaurants</Link>}
        />
      </div>
    );
  }

  const serviceFee = cart.subtotal * 0.05;
  const tax = cart.subtotal * 0.08;
  const total = cart.subtotal + cart.delivery_fee + serviceFee + tax - discount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Your Cart</h1>
        <button onClick={handleClearCart} className="text-sm text-red-500 font-semibold hover:text-red-600">
          Clear cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.restaurant && (
            <div className="card p-4 flex items-center gap-3">
              <img
                src={cart.restaurant.logo_url || cart.restaurant.cover_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'}
                alt={cart.restaurant.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <p className="font-bold text-gray-900">{cart.restaurant.name}</p>
                <p className="text-xs text-gray-500">{cart.restaurant.cuisine}</p>
              </div>
            </div>
          )}

          {cart.items.map((item: CartItem) => (
            <div key={item.id} className="card p-3 flex gap-3">
              <img
                src={item.image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200'}
                alt={item.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900">{item.name}</h3>
                {item.selected_variations && item.selected_variations.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.selected_variations.map((v) => `${v.variation}: ${v.option}`).join(', ')}
                  </p>
                )}
                {item.selected_addons && item.selected_addons.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Add-ons: {item.selected_addons.map((a) => a.name).join(', ')}
                  </p>
                )}
                {item.special_instructions && (
                  <p className="text-xs text-gray-400 italic">"{item.special_instructions}"</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">{formatPrice(item.total_price)}</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Fee</span>
                <span className="font-semibold">{formatPrice(cart.delivery_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service Fee</span>
                <span className="font-semibold">{formatPrice(serviceFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="font-semibold">{formatPrice(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-semibold">-{formatPrice(discount)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon code"
                    className="input pl-9 text-sm"
                  />
                </div>
                <button onClick={handleApplyCoupon} className="btn-outline btn-md">
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-extrabold text-xl text-[#ff5847]">{formatPrice(total)}</span>
            </div>

            <button
              onClick={() => navigate(`/checkout?cartId=${cart.id}&discount=${discount}&couponId=${appliedCoupon || ''}`)}
              className="btn-primary btn-lg w-full mt-4"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
