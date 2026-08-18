-- Add FK from reviews.user_id -> profiles.id so PostgREST can resolve the
-- `profile:profiles(*)` join used in getRestaurantReviews and admin queries.
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_user_id_profiles_fkey;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;