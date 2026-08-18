/*
# Multi-Vendor Food Delivery Marketplace — Core Schema

## Overview
Creates the complete relational database for a production-ready multi-vendor food delivery platform with four user roles: CUSTOMER, VENDOR, RIDER, and ADMIN.

## New Tables
1. **profiles** — Extends auth.users with role, name, phone, avatar
2. **addresses** — User delivery addresses with coordinates
3. **restaurant_categories** — Cuisine categories (Pizza, Burgers, etc.)
4. **food_categories** — Menu categories within restaurants
5. **restaurants** — Vendor restaurant listings with location, hours, fees
6. **restaurant_staff** — Staff members for multi-staff restaurants
7. **food_items** — Menu items with pricing, images, availability
8. **food_variations** — Size/style variations (Small/Medium/Large)
9. **variation_options** — Specific options within a variation group
10. **food_addons** — Add-on items (extra cheese, etc.)
11. **carts** — Restaurant-scoped shopping carts
12. **cart_items** — Items in cart with selected variations/addons
13. **orders** — Order with status, totals, addresses
14. **order_items** — Line items in an order
15. **order_status_history** — Timeline of status changes
16. **riders** — Rider profiles with vehicle info, status
17. **rider_assignments** — Links riders to orders
18. **payments** — Payment records per order
19. **coupons** — Discount codes with rules
20. **coupon_usage** — Tracks coupon usage per user
21. **reviews** — Ratings and reviews for restaurants/food/delivery
22. **favorites** — User's favorited restaurants
23. **notifications** — In-app notifications with read state
24. **banners** — Homepage promotional banners
25. **promotions** — Promotional campaigns
26. **delivery_zones** — Geographic delivery zones
27. **platform_settings** — Platform-wide configuration

## Security
- RLS enabled on every table
- Owner-scoped policies for user data
- Public read for restaurant/food catalog data
- Vendor-scoped policies via restaurant ownership
- Rider-scoped policies for delivery data
- Admin full access via role check

## Notes
1. Order status uses an enum with full lifecycle states
2. All location data stores lat/lng as double precision for Mapbox
3. Soft deletes via deleted_at on restaurants and food_items
4. Rating columns computed dynamically from reviews
5. Order timeline tracked in order_status_history
*/

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CUSTOMER', 'VENDOR', 'RIDER', 'ADMIN', 'VENDOR_STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP',
    'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'CANCELLED', 'REJECTED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CARD', 'PAYPAL', 'CASH_ON_DELIVERY', 'STRIPE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coupon_type AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_type AS ENUM ('RESTAURANT', 'FOOD', 'DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rider_status AS ENUM ('OFFLINE', 'ONLINE', 'BUSY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE restaurant_status AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  avatar_url text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  address_line1 text NOT NULL,
  address_line2 text DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text DEFAULT '',
  postal_code text DEFAULT '',
  country text DEFAULT '',
  latitude double precision,
  longitude double precision,
  formatted_address text DEFAULT '',
  delivery_instructions text DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_addresses" ON addresses;
CREATE POLICY "select_own_addresses" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_addresses" ON addresses;
CREATE POLICY "insert_own_addresses" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_addresses" ON addresses;
CREATE POLICY "update_own_addresses" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_addresses" ON addresses;
CREATE POLICY "delete_own_addresses" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- RESTAURANT CATEGORIES (cuisines)
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT '',
  image_url text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE restaurant_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_restaurant_categories" ON restaurant_categories;
CREATE POLICY "read_restaurant_categories" ON restaurant_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_restaurant_categories_admin" ON restaurant_categories;
CREATE POLICY "insert_restaurant_categories_admin" ON restaurant_categories FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "update_restaurant_categories_admin" ON restaurant_categories;
CREATE POLICY "update_restaurant_categories_admin" ON restaurant_categories FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "delete_restaurant_categories_admin" ON restaurant_categories;
CREATE POLICY "delete_restaurant_categories_admin" ON restaurant_categories FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  category_id uuid REFERENCES restaurant_categories(id) ON DELETE SET NULL,
  cuisine text DEFAULT '',
  logo_url text DEFAULT '',
  cover_url text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT '',
  postal_code text DEFAULT '',
  latitude double precision,
  longitude double precision,
  formatted_address text DEFAULT '',
  delivery_radius_km double precision NOT NULL DEFAULT 5,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  minimum_order numeric(10,2) NOT NULL DEFAULT 0,
  estimated_delivery_time_min int NOT NULL DEFAULT 30,
  opening_time time DEFAULT '09:00',
  closing_time time DEFAULT '22:00',
  is_open boolean NOT NULL DEFAULT true,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  status restaurant_status NOT NULL DEFAULT 'PENDING',
  featured boolean NOT NULL DEFAULT false,
  price_level int NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_featured ON restaurants(featured);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_restaurants" ON restaurants;
CREATE POLICY "read_restaurants" ON restaurants FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "insert_own_restaurants" ON restaurants;
CREATE POLICY "insert_own_restaurants" ON restaurants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_restaurants" ON restaurants;
CREATE POLICY "update_own_restaurants" ON restaurants FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_restaurants_admin" ON restaurants;
CREATE POLICY "update_restaurants_admin" ON restaurants FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- RESTAURANT STAFF
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'VENDOR_STAFF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON restaurant_staff(user_id);

ALTER TABLE restaurant_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_restaurant_staff" ON restaurant_staff;
CREATE POLICY "read_restaurant_staff" ON restaurant_staff FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "insert_restaurant_staff" ON restaurant_staff;
CREATE POLICY "insert_restaurant_staff" ON restaurant_staff FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_restaurant_staff" ON restaurant_staff;
CREATE POLICY "update_restaurant_staff" ON restaurant_staff FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_restaurant_staff" ON restaurant_staff;
CREATE POLICY "delete_restaurant_staff" ON restaurant_staff FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

-- ============================================================
-- FOOD CATEGORIES (menu categories within restaurants)
-- ============================================================
CREATE TABLE IF NOT EXISTS food_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_cat_restaurant ON food_categories(restaurant_id);

ALTER TABLE food_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_food_categories" ON food_categories;
CREATE POLICY "read_food_categories" ON food_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_food_categories_owner" ON food_categories;
CREATE POLICY "insert_food_categories_owner" ON food_categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_food_categories_owner" ON food_categories;
CREATE POLICY "update_food_categories_owner" ON food_categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_food_categories_owner" ON food_categories;
CREATE POLICY "delete_food_categories_owner" ON food_categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

-- ============================================================
-- FOOD ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES food_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  price numeric(10,2) NOT NULL,
  discounted_price numeric(10,2),
  calories int,
  is_vegetarian boolean NOT NULL DEFAULT false,
  is_vegan boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_items_restaurant ON food_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON food_items(category_id);
CREATE INDEX IF NOT EXISTS idx_food_items_available ON food_items(is_available);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_food_items" ON food_items;
CREATE POLICY "read_food_items" ON food_items FOR SELECT
  TO anon, authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "insert_food_items_owner" ON food_items;
CREATE POLICY "insert_food_items_owner" ON food_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_food_items_owner" ON food_items;
CREATE POLICY "update_food_items_owner" ON food_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_food_items_owner" ON food_items;
CREATE POLICY "delete_food_items_owner" ON food_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

-- ============================================================
-- FOOD VARIATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS food_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id uuid NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  max_selections int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_variations_item ON food_variations(food_item_id);

ALTER TABLE food_variations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_food_variations" ON food_variations;
CREATE POLICY "read_food_variations" ON food_variations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_food_variations_owner" ON food_variations;
CREATE POLICY "insert_food_variations_owner" ON food_variations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM food_items fi JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fi.id = food_item_id AND r.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_food_variations_owner" ON food_variations;
CREATE POLICY "update_food_variations_owner" ON food_variations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM food_items fi JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fi.id = food_item_id AND r.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_food_variations_owner" ON food_variations;
CREATE POLICY "delete_food_variations_owner" ON food_variations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM food_items fi JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fi.id = food_item_id AND r.owner_id = auth.uid())
  );

-- ============================================================
-- VARIATION OPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS variation_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id uuid NOT NULL REFERENCES food_variations(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_modifier numeric(10,2) NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variation_options ON variation_options(variation_id);

ALTER TABLE variation_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_variation_options" ON variation_options;
CREATE POLICY "read_variation_options" ON variation_options FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_variation_options_owner" ON variation_options;
CREATE POLICY "insert_variation_options_owner" ON variation_options FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM food_variations fv
     JOIN food_items fi ON fv.food_item_id = fi.id
     JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fv.id = variation_id AND r.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_variation_options_owner" ON variation_options;
CREATE POLICY "update_variation_options_owner" ON variation_options FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM food_variations fv
     JOIN food_items fi ON fv.food_item_id = fi.id
     JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fv.id = variation_id AND r.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_variation_options_owner" ON variation_options;
CREATE POLICY "delete_variation_options_owner" ON variation_options FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM food_variations fv
     JOIN food_items fi ON fv.food_item_id = fi.id
     JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fv.id = variation_id AND r.owner_id = auth.uid())
  );

-- ============================================================
-- FOOD ADDONS
-- ============================================================
CREATE TABLE IF NOT EXISTS food_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id uuid NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_addons_item ON food_addons(food_item_id);

ALTER TABLE food_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_food_addons" ON food_addons;
CREATE POLICY "read_food_addons" ON food_addons FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_food_addons_owner" ON food_addons;
CREATE POLICY "insert_food_addons_owner" ON food_addons FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM food_items fi JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fi.id = food_item_id AND r.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_food_addons_owner" ON food_addons;
CREATE POLICY "update_food_addons_owner" ON food_addons FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM food_items fi JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fi.id = food_item_id AND r.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_food_addons_owner" ON food_addons;
CREATE POLICY "delete_food_addons_owner" ON food_addons FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM food_items fi JOIN restaurants r ON fi.restaurant_id = r.id
     WHERE fi.id = food_item_id AND r.owner_id = auth.uid())
  );

-- ============================================================
-- COUPONS (must exist before carts due to FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text DEFAULT '',
  discount_type coupon_type NOT NULL DEFAULT 'PERCENTAGE',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  minimum_order numeric(10,2) NOT NULL DEFAULT 0,
  maximum_discount numeric(10,2),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES restaurant_categories(id) ON DELETE CASCADE,
  usage_limit int,
  per_user_limit int DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant ON coupons(restaurant_id);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_coupons" ON coupons;
CREATE POLICY "read_coupons" ON coupons FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "insert_coupons_owner" ON coupons;
CREATE POLICY "insert_coupons_owner" ON coupons FOR INSERT
  TO authenticated WITH CHECK (
    (restaurant_id IS NOT NULL AND EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "update_coupons_owner" ON coupons;
CREATE POLICY "update_coupons_owner" ON coupons FOR UPDATE
  TO authenticated USING (
    (restaurant_id IS NOT NULL AND EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "delete_coupons_owner" ON coupons;
CREATE POLICY "delete_coupons_owner" ON coupons FOR DELETE
  TO authenticated USING (
    (restaurant_id IS NOT NULL AND EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================================
-- CARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_carts" ON carts;
CREATE POLICY "select_own_carts" ON carts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_carts" ON carts;
CREATE POLICY "insert_own_carts" ON carts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_carts" ON carts;
CREATE POLICY "update_own_carts" ON carts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_carts" ON carts;
CREATE POLICY "delete_own_carts" ON carts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  food_item_id uuid NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text DEFAULT '',
  base_price numeric(10,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  selected_variations jsonb DEFAULT '[]',
  selected_addons jsonb DEFAULT '[]',
  special_instructions text DEFAULT '',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cart_items" ON cart_items;
CREATE POLICY "select_own_cart_items" ON cart_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_cart_items" ON cart_items;
CREATE POLICY "insert_own_cart_items" ON cart_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_cart_items" ON cart_items;
CREATE POLICY "update_own_cart_items" ON cart_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_cart_items" ON cart_items;
CREATE POLICY "delete_own_cart_items" ON cart_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  );

-- ============================================================
-- RIDERS (must exist before orders due to FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL DEFAULT 'motorcycle',
  vehicle_plate text DEFAULT '',
  license_number text DEFAULT '',
  status rider_status NOT NULL DEFAULT 'OFFLINE',
  rating numeric(3,2) NOT NULL DEFAULT 5,
  total_deliveries int NOT NULL DEFAULT 0,
  total_earnings numeric(10,2) NOT NULL DEFAULT 0,
  current_latitude double precision,
  current_longitude double precision,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riders_user ON riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);

ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_riders" ON riders;
CREATE POLICY "read_riders" ON riders FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'VENDOR'))
  );

DROP POLICY IF EXISTS "insert_own_rider" ON riders;
CREATE POLICY "insert_own_rider" ON riders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rider" ON riders;
CREATE POLICY "update_own_rider" ON riders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_riders_admin" ON riders;
CREATE POLICY "update_riders_admin" ON riders FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES riders(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'PENDING',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  service_fee numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL,
  delivery_address text NOT NULL DEFAULT '',
  delivery_latitude double precision,
  delivery_longitude double precision,
  delivery_instructions text DEFAULT '',
  payment_method payment_method NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  estimated_delivery_time int NOT NULL DEFAULT 30,
  placed_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM riders WHERE user_id = auth.uid() AND id = orders.rider_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_orders_owner" ON orders;
CREATE POLICY "update_orders_owner" ON orders FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM riders WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id uuid REFERENCES food_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  image_url text DEFAULT '',
  base_price numeric(10,2) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  selected_variations jsonb DEFAULT '[]',
  selected_addons jsonb DEFAULT '[]',
  special_instructions text DEFAULT '',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_order_items" ON order_items;
CREATE POLICY "read_order_items" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders o
     WHERE o.id = order_id
     AND (o.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
     ))
  );

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_order ON order_status_history(order_id);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_order_status_history" ON order_status_history;
CREATE POLICY "read_order_status_history" ON order_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders o
     WHERE o.id = order_id
     AND (o.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
     ))
  );

DROP POLICY IF EXISTS "insert_order_status_history" ON order_status_history;
CREATE POLICY "insert_order_status_history" ON order_status_history FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders o
     WHERE o.id = order_id
     AND (o.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
       OR EXISTS (SELECT 1 FROM riders WHERE user_id = auth.uid())
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
     ))
  );

-- ============================================================
-- RIDER ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS rider_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ASSIGNED',
  assigned_at timestamptz DEFAULT now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_assignments_order ON rider_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_rider_assignments_rider ON rider_assignments(rider_id);

ALTER TABLE rider_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_rider_assignments" ON rider_assignments;
CREATE POLICY "read_rider_assignments" ON rider_assignments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM riders WHERE id = rider_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders o JOIN restaurants r ON o.restaurant_id = r.id
     WHERE o.id = order_id AND r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "insert_rider_assignments" ON rider_assignments;
CREATE POLICY "insert_rider_assignments" ON rider_assignments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM riders WHERE id = rider_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "update_rider_assignments" ON rider_assignments;
CREATE POLICY "update_rider_assignments" ON rider_assignments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM riders WHERE id = rider_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'CASH_ON_DELIVERY',
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  transaction_id text DEFAULT '',
  provider_response jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_payments" ON payments;
CREATE POLICY "read_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders o
     WHERE o.id = order_id
     AND (o.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
     ))
  );

DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders o
     WHERE o.id = order_id
     AND (o.user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
     ))
  );

-- ============================================================
-- COUPON USAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  used_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);

ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_coupon_usage" ON coupon_usage;
CREATE POLICY "read_own_coupon_usage" ON coupon_usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_coupon_usage" ON coupon_usage;
CREATE POLICY "insert_own_coupon_usage" ON coupon_usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  food_item_id uuid REFERENCES food_items(id) ON DELETE SET NULL,
  rider_id uuid REFERENCES riders(id) ON DELETE SET NULL,
  review_type review_type NOT NULL DEFAULT 'RESTAURANT',
  rating int NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  images jsonb DEFAULT '[]',
  vendor_response text DEFAULT '',
  vendor_response_at timestamptz,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_food ON reviews(food_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rider ON reviews(rider_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_reviews" ON reviews;
CREATE POLICY "read_reviews" ON reviews FOR SELECT
  TO anon, authenticated USING (is_hidden = false OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reviews" ON reviews;
CREATE POLICY "update_own_reviews" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_reviews_vendor" ON reviews;
CREATE POLICY "update_reviews_vendor" ON reviews FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_reviews_admin" ON reviews;
CREATE POLICY "update_reviews_admin" ON reviews FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'GENERAL',
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text DEFAULT '',
  image_url text DEFAULT '',
  link_url text DEFAULT '',
  placement text NOT NULL DEFAULT 'home_hero',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_banners" ON banners;
CREATE POLICY "read_banners" ON banners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_banners_admin" ON banners;
CREATE POLICY "insert_banners_admin" ON banners FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "update_banners_admin" ON banners;
CREATE POLICY "update_banners_admin" ON banners FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "delete_banners_admin" ON banners;
CREATE POLICY "delete_banners_admin" ON banners FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- PROMOTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  discount_text text DEFAULT '',
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_promotions" ON promotions;
CREATE POLICY "read_promotions" ON promotions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_promotions_owner" ON promotions;
CREATE POLICY "insert_promotions_owner" ON promotions FOR INSERT
  TO authenticated WITH CHECK (
    (restaurant_id IS NOT NULL AND EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "update_promotions_owner" ON promotions;
CREATE POLICY "update_promotions_owner" ON promotions FOR UPDATE
  TO authenticated USING (
    (restaurant_id IS NOT NULL AND EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "delete_promotions_owner" ON promotions;
CREATE POLICY "delete_promotions_owner" ON promotions FOR DELETE
  TO authenticated USING (
    (restaurant_id IS NOT NULL AND EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id AND owner_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================================
-- DELIVERY ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  latitude double precision,
  longitude double precision,
  radius_km double precision NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_delivery_zones" ON delivery_zones;
CREATE POLICY "read_delivery_zones" ON delivery_zones FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_delivery_zones_admin" ON delivery_zones;
CREATE POLICY "insert_delivery_zones_admin" ON delivery_zones FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "update_delivery_zones_admin" ON delivery_zones;
CREATE POLICY "update_delivery_zones_admin" ON delivery_zones FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "delete_delivery_zones_admin" ON delivery_zones;
CREATE POLICY "delete_delivery_zones_admin" ON delivery_zones FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- PLATFORM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_platform_settings" ON platform_settings;
CREATE POLICY "read_platform_settings" ON platform_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "update_platform_settings_admin" ON platform_settings;
CREATE POLICY "update_platform_settings_admin" ON platform_settings FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

DROP POLICY IF EXISTS "insert_platform_settings_admin" ON platform_settings;
CREATE POLICY "insert_platform_settings_admin" ON platform_settings FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- ============================================================
-- TRIGGERS: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER')::user_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_restaurants ON restaurants;
CREATE TRIGGER set_updated_at_restaurants BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_food_items ON food_items;
CREATE TRIGGER set_updated_at_food_items BEFORE UPDATE ON food_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_orders ON orders;
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_riders ON riders;
CREATE TRIGGER set_updated_at_riders BEFORE UPDATE ON riders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_addresses ON addresses;
CREATE TRIGGER set_updated_at_addresses BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ORDER NUMBER SEQUENCE
-- ============================================================
DO $$ BEGIN
  CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PLATFORM SETTINGS SEED
-- ============================================================
INSERT INTO platform_settings (key, value, description) VALUES
  ('platform_name', '"FoodHub"', 'Platform display name'),
  ('platform_commission', '0.10', 'Platform commission rate'),
  ('delivery_fee_default', '2.99', 'Default delivery fee'),
  ('service_fee_percent', '0.05', 'Service fee percentage'),
  ('tax_rate', '0.08', 'Default tax rate'),
  ('currency', '"USD"', 'Platform currency'),
  ('contact_email', '"support@foodhub.com"', 'Support contact email'),
  ('contact_phone', '"+1-800-FOODHUB"', 'Support contact phone')
ON CONFLICT (key) DO NOTHING;
