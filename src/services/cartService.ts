import { supabase } from '@/lib/supabase';
import type { Cart, CartItem, SelectedVariation, SelectedAddon, Coupon } from '@/types';
import { generateOrderNumber } from '@/lib/utils';

export async function getCart(userId: string): Promise<Cart | null> {
  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select('*, restaurant:restaurants(*)')
    .eq('user_id', userId)
    .maybeSingle();
  if (cartError) throw cartError;
  if (!cart) return null;

  const { data: items, error: itemsError } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: false });
  if (itemsError) throw itemsError;

  return { ...cart, items: (items || []) as CartItem[] } as Cart;
}

export async function createCart(userId: string, restaurantId: string): Promise<string> {
  const { data, error } = await supabase
    .from('carts')
    .insert({ user_id: userId, restaurant_id: restaurantId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function clearCart(cartId: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);
  if (error) throw error;
}

export async function deleteCart(cartId: string): Promise<void> {
  const { error } = await supabase.from('carts').delete().eq('id', cartId);
  if (error) throw error;
}

export async function addToCart(
  cartId: string,
  item: {
    food_item_id: string;
    name: string;
    image_url: string;
    base_price: number;
    quantity: number;
    selected_variations: SelectedVariation[];
    selected_addons: SelectedAddon[];
    special_instructions: string;
    unit_price: number;
    total_price: number;
  }
): Promise<void> {
  const { error } = await supabase.from('cart_items').insert({
    cart_id: cartId,
    ...item,
  });
  if (error) throw error;
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
    if (error) throw error;
    return;
  }
  const { data: item } = await supabase
    .from('cart_items')
    .select('unit_price')
    .eq('id', itemId)
    .single();
  if (!item) return;

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity, total_price: item.unit_price * quantity })
    .eq('id', itemId);
  if (error) throw error;
}

export async function removeCartItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<{ valid: boolean; coupon: Coupon | null; discount: number; error?: string }> {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!coupon) return { valid: false, coupon: null, discount: 0, error: 'Invalid coupon code' };

  if (subtotal < coupon.minimum_order) {
    return { valid: false, coupon: null, discount: 0, error: `Minimum order of $${coupon.minimum_order} required` };
  }

  let discount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    discount = (subtotal * coupon.discount_value) / 100;
    if (coupon.maximum_discount && discount > coupon.maximum_discount) {
      discount = coupon.maximum_discount;
    }
  } else {
    discount = coupon.discount_value;
  }

  return { valid: true, coupon: coupon as Coupon, discount };
}

export async function placeOrder(orderData: {
  user_id: string;
  restaurant_id: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  discount: number;
  total: number;
  coupon_id?: string | null;
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_instructions: string;
  payment_method: string;
  estimated_delivery_time: number;
  items: Array<{
    food_item_id: string;
    name: string;
    image_url: string;
    base_price: number;
    quantity: number;
    selected_variations: SelectedVariation[];
    selected_addons: SelectedAddon[];
    special_instructions: string;
    unit_price: number;
    total_price: number;
  }>;
}): Promise<{ orderId: string; orderNumber: string }> {
  const orderNumber = generateOrderNumber();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: orderData.user_id,
      restaurant_id: orderData.restaurant_id,
      status: 'PENDING',
      subtotal: orderData.subtotal,
      delivery_fee: orderData.delivery_fee,
      service_fee: orderData.service_fee,
      tax: orderData.tax,
      discount: orderData.discount,
      total: orderData.total,
      coupon_id: orderData.coupon_id || null,
      delivery_address: orderData.delivery_address,
      delivery_latitude: orderData.delivery_latitude || null,
      delivery_longitude: orderData.delivery_longitude || null,
      delivery_instructions: orderData.delivery_instructions,
      payment_method: orderData.payment_method,
      payment_status: orderData.payment_method === 'CASH_ON_DELIVERY' ? 'COD' : 'PENDING',
      estimated_delivery_time: orderData.estimated_delivery_time,
    })
    .select('id')
    .single();
  if (orderError) throw orderError;

  const orderItems = orderData.items.map((item) => ({
    order_id: order.id,
    ...item,
    selected_variations: item.selected_variations as unknown as never,
    selected_addons: item.selected_addons as unknown as never,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert({
      order_id: order.id,
      status: 'PENDING',
      note: 'Order placed',
      created_by: orderData.user_id,
    });
  if (historyError) throw historyError;

  const { error: notifError } = await supabase.from('notifications').insert({
    user_id: orderData.user_id,
    type: 'ORDER',
    title: 'Order Placed',
    message: `Your order ${orderNumber} has been placed successfully!`,
    data: { order_id: order.id },
  });
  if (notifError) console.error('Failed to create notification:', notifError);

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('owner_id, name')
    .eq('id', orderData.restaurant_id)
    .single();
  if (restaurant) {
    await supabase.from('notifications').insert({
      user_id: restaurant.owner_id,
      type: 'ORDER',
      title: 'New Order',
      message: `New order ${orderNumber} received!`,
      data: { order_id: order.id },
    });
  }

  return { orderId: order.id, orderNumber };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  userId: string,
  note?: string
): Promise<void> {
  const updates: Record<string, string> = {};
  if (status === 'CONFIRMED') updates.confirmed_at = new Date().toISOString();
  if (status === 'DELIVERED') updates.delivered_at = new Date().toISOString();
  if (status === 'CANCELLED' || status === 'REJECTED') updates.cancelled_at = new Date().toISOString();

  const { error: orderError } = await supabase
    .from('orders')
    .update({ status, ...updates })
    .eq('id', orderId);
  if (orderError) throw orderError;

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      status: status as never,
      note: note || '',
      created_by: userId,
    });
  if (historyError) throw historyError;

  const { data: order } = await supabase
    .from('orders')
    .select('user_id, order_number')
    .eq('id', orderId)
    .single();
  if (order) {
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'ORDER',
      title: 'Order Update',
      message: `Your order ${order.order_number} status: ${status.replace(/_/g, ' ')}`,
      data: { order_id: orderId },
    });
  }
}
