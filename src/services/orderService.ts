import { supabase } from '@/lib/supabase';
import type { Order, OrderStatusHistory, Address, Notification, Favorite, Review } from '@/types';

export async function getOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurant:restaurants(*), items:order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Order[];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, restaurant:restaurants(*), items:order_items(*), rider:riders(*, profile:profiles(*)), status_history:order_status_history(*)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addAddress(address: Omit<Address, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
  const { error } = await supabase.from('addresses').insert(address);
  if (error) throw error;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', addressId);
  if (error) throw error;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, restaurant:restaurants(*, category:restaurant_categories(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function toggleFavorite(userId: string, restaurantId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('favorites').insert({ user_id: userId, restaurant_id: restaurantId });
    return true;
  }
}

export async function isFavorited(userId: string, restaurantId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  return !!data;
}

export async function addReview(review: {
  user_id: string;
  restaurant_id?: string;
  order_id?: string;
  food_item_id?: string;
  rider_id?: string;
  review_type: string;
  rating: number;
  comment: string;
  images?: string[];
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    ...review,
    images: (review.images || []) as unknown as never,
  review_type: review.review_type as never,
  restaurant_id: review.restaurant_id || null,
    order_id: review.order_id || null,
    food_item_id: review.food_item_id || null,
    rider_id: review.rider_id || null,
  });
  if (error) throw error;
}

export async function getRestaurantReviews(restaurantId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(*)')
    .eq('restaurant_id', restaurantId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Review[];
}
