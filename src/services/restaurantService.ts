import { supabase } from '@/lib/supabase';
import type { Restaurant, FoodItem, FoodCategory, FoodVariation, VariationOption, FoodAddon, RestaurantCategory, Review, Banner, Promotion } from '@/types';

export async function getRestaurantCategories(): Promise<RestaurantCategory[]> {
  const { data, error } = await supabase
    .from('restaurant_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRestaurants(filters?: {
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
}): Promise<Restaurant[]> {
  let query = supabase
    .from('restaurants')
    .select('*, category:restaurant_categories(*)')
    .is('deleted_at', null)
    .eq('status', 'APPROVED');

  if (filters?.category) {
    query = query.eq('category_id', filters.category);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,cuisine.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters?.featured) {
    query = query.eq('featured', true);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order('rating', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, category:restaurant_categories(*)')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data as Restaurant | null;
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, category:restaurant_categories(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Restaurant | null;
}

export async function getFoodCategories(restaurantId: string): Promise<FoodCategory[]> {
  const { data, error } = await supabase
    .from('food_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getFoodItems(restaurantId: string): Promise<FoodItem[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('deleted_at', null)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function getFoodItemDetails(foodItemId: string) {
  const { data: item, error: itemError } = await supabase
    .from('food_items')
    .select('*')
    .eq('id', foodItemId)
    .maybeSingle();
  if (itemError) throw itemError;

  const { data: variations, error: varError } = await supabase
    .from('food_variations')
    .select('*')
    .eq('food_item_id', foodItemId)
    .order('sort_order');
  if (varError) throw varError;

  const variationIds = (variations || []).map((v) => v.id);
  let options: VariationOption[] = [];
  if (variationIds.length > 0) {
    const { data: opts, error: optError } = await supabase
      .from('variation_options')
      .select('*')
      .in('variation_id', variationIds)
      .order('sort_order');
    if (optError) throw optError;
    options = opts || [];
  }

  const { data: addons, error: addonError } = await supabase
    .from('food_addons')
    .select('*')
    .eq('food_item_id', foodItemId)
    .eq('is_available', true)
    .order('sort_order');
  if (addonError) throw addonError;

  return {
    item: item as FoodItem | null,
    variations: (variations || []) as FoodVariation[],
    options,
    addons: (addons || []) as FoodAddon[],
  };
}

export async function searchFoodItems(query: string, limit = 20): Promise<(FoodItem & { restaurant?: Restaurant })[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*, restaurant:restaurants(*)')
    .is('deleted_at', null)
    .eq('is_available', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);
  if (error) throw error;
  return (data || []) as (FoodItem & { restaurant?: Restaurant })[];
}

export async function getReviews(restaurantId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profile:profiles(*)')
    .eq('restaurant_id', restaurantId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Review[];
}
