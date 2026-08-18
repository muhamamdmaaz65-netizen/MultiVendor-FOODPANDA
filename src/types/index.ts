export type UserRole = 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'ADMIN' | 'VENDOR_STAFF';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'COD';
export type PaymentMethod = 'CARD' | 'PAYPAL' | 'CASH_ON_DELIVERY' | 'STRIPE';
export type CouponType = 'PERCENTAGE' | 'FIXED';
export type ReviewType = 'RESTAURANT' | 'FOOD' | 'DELIVERY';
export type RiderStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';
export type RestaurantStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string;
  delivery_instructions: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface FoodCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  cuisine: string;
  logo_url: string;
  cover_url: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string;
  delivery_radius_km: number;
  delivery_fee: number;
  minimum_order: number;
  estimated_delivery_time_min: number;
  opening_time: string;
  closing_time: string;
  is_open: boolean;
  rating: number;
  review_count: number;
  status: RestaurantStatus;
  featured: boolean;
  price_level: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  category?: RestaurantCategory;
}

export interface FoodItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string;
  image_url: string;
  price: number;
  discounted_price: number | null;
  calories: number | null;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_available: boolean;
  rating: number;
  review_count: number;
  sort_order: number;
  deleted_at: string | null;
}

export interface FoodVariation {
  id: string;
  food_item_id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
}

export interface VariationOption {
  id: string;
  variation_id: string;
  name: string;
  price_modifier: number;
  is_default: boolean;
  sort_order: number;
}

export interface FoodAddon {
  id: string;
  food_item_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface Cart {
  id: string;
  user_id: string;
  restaurant_id: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  discount: number;
  total: number;
  coupon_id: string | null;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  items?: CartItem[];
}

export interface CartItem {
  id: string;
  cart_id: string;
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

export interface SelectedVariation {
  variation: string;
  option: string;
  price_modifier: number;
}

export interface SelectedAddon {
  name: string;
  price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  restaurant_id: string;
  rider_id: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  discount: number;
  total: number;
  coupon_id: string | null;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  delivery_instructions: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  estimated_delivery_time: number;
  placed_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  items?: OrderItem[];
  rider?: Rider;
  status_history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  food_item_id: string | null;
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

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface Rider {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_plate: string;
  license_number: string;
  status: RiderStatus;
  rating: number;
  total_deliveries: number;
  total_earnings: number;
  current_latitude: number | null;
  current_longitude: number | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: CouponType;
  discount_value: number;
  minimum_order: number;
  maximum_discount: number | null;
  restaurant_id: string | null;
  category_id: string | null;
  usage_limit: number | null;
  per_user_limit: number;
  used_count: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  order_id: string | null;
  restaurant_id: string | null;
  food_item_id: string | null;
  rider_id: string | null;
  review_type: ReviewType;
  rating: number;
  comment: string;
  images: string[];
  vendor_response: string;
  vendor_response_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  restaurant?: Restaurant;
}

export interface Favorite {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
  restaurant?: Restaurant;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  placement: string;
  sort_order: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  restaurant_id: string | null;
  discount_text: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  is_active: boolean;
}

export interface PlatformSettings {
  id: string;
  key: string;
  value: unknown;
  description: string;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  RIDER_ASSIGNED: 'Rider Assigned',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  REFUNDED: 'Refunded',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PREPARING: 'bg-orange-100 text-orange-700',
  READY_FOR_PICKUP: 'bg-cyan-100 text-cyan-700',
  RIDER_ASSIGNED: 'bg-indigo-100 text-indigo-700',
  PICKED_UP: 'bg-violet-100 text-violet-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};
