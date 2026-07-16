-- ============================================================
-- ShopVerse E-Commerce - Complete Database Schema
-- Database: Supabase PostgreSQL
-- Version: 1.0.0
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'returned'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'
);

CREATE TYPE payment_method AS ENUM (
  'credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cod', 'stripe'
);

CREATE TYPE user_role AS ENUM ('customer', 'admin', 'moderator', 'vendor');

CREATE TYPE address_type AS ENUM ('home', 'work', 'other');

CREATE TYPE notification_type AS ENUM (
  'order', 'payment', 'promotion', 'system', 'review', 'wishlist', 'stock'
);

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');

CREATE TYPE product_condition AS ENUM ('new', 'refurbished', 'used');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  display_name  TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  role          user_role DEFAULT 'customer',
  is_active     BOOLEAN DEFAULT TRUE,
  is_verified   BOOLEAN DEFAULT FALSE,
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================

CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  icon        TEXT,
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  meta_title  TEXT,
  meta_desc   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BRANDS
-- ============================================================

CREATE TABLE public.brands (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  website     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  short_desc      TEXT,
  sku             TEXT UNIQUE,
  barcode         TEXT,
  price           DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  compare_price   DECIMAL(12, 2) CHECK (compare_price >= 0),
  cost_price      DECIMAL(12, 2) CHECK (cost_price >= 0),
  currency        TEXT DEFAULT 'INR',
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id        UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  condition       product_condition DEFAULT 'new',
  weight          DECIMAL(8, 3),
  dimensions      JSONB,
  specifications  JSONB,
  tags            TEXT[],
  is_active       BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  is_best_seller  BOOLEAN DEFAULT FALSE,
  is_new_arrival  BOOLEAN DEFAULT FALSE,
  is_flash_sale   BOOLEAN DEFAULT FALSE,
  flash_sale_end  TIMESTAMPTZ,
  meta_title      TEXT,
  meta_desc       TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================

CREATE TABLE public.product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  is_primary  BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE public.inventory (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID UNIQUE NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity         INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_qty     INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
  low_stock_alert  INTEGER DEFAULT 10,
  allow_backorder  BOOLEAN DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================

CREATE TABLE public.product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  value       TEXT NOT NULL,
  price_diff  DECIMAL(10, 2) DEFAULT 0,
  sku         TEXT,
  stock       INTEGER DEFAULT 0,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADDRESSES
-- ============================================================

CREATE TABLE public.addresses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           address_type DEFAULT 'home',
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address_line1  TEXT NOT NULL,
  address_line2  TEXT,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  postal_code    TEXT NOT NULL,
  country        TEXT DEFAULT 'India',
  is_default     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COUPONS
-- ============================================================

CREATE TABLE public.coupons (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT UNIQUE NOT NULL,
  description         TEXT,
  discount_type       discount_type NOT NULL,
  discount_value      DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_amount    DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2),
  usage_limit         INTEGER,
  used_count          INTEGER DEFAULT 0,
  per_user_limit      INTEGER DEFAULT 1,
  valid_from          TIMESTAMPTZ DEFAULT NOW(),
  valid_until         TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT TRUE,
  applicable_categories UUID[],
  applicable_products UUID[],
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CART
-- ============================================================

CREATE TABLE public.carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  TEXT,
  coupon_id   UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.cart_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id     UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price       DECIMAL(10, 2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cart_id, product_id, variant_id)
);

-- ============================================================
-- WISHLIST
-- ============================================================

CREATE TABLE public.wishlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE public.orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number        TEXT UNIQUE NOT NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status              order_status DEFAULT 'pending',
  subtotal            DECIMAL(12, 2) NOT NULL,
  discount_amount     DECIMAL(10, 2) DEFAULT 0,
  shipping_amount     DECIMAL(10, 2) DEFAULT 0,
  tax_amount          DECIMAL(10, 2) DEFAULT 0,
  total_amount        DECIMAL(12, 2) NOT NULL,
  coupon_id           UUID REFERENCES public.coupons(id),
  shipping_address    JSONB NOT NULL,
  billing_address     JSONB,
  notes               TEXT,
  tracking_number     TEXT,
  estimated_delivery  DATE,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id   UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku  TEXT,
  image_url    TEXT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  price        DECIMAL(10, 2) NOT NULL,
  total        DECIMAL(10, 2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDER STATUS HISTORY
-- ============================================================

CREATE TABLE public.order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  note        TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE public.payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_method        payment_method NOT NULL,
  payment_status        payment_status DEFAULT 'pending',
  amount                DECIMAL(12, 2) NOT NULL,
  currency              TEXT DEFAULT 'INR',
  transaction_id        TEXT,
  gateway_response      JSONB,
  stripe_payment_intent TEXT,
  stripe_session_id     TEXT,
  paid_at               TIMESTAMPTZ,
  refunded_at           TIMESTAMPTZ,
  refund_amount         DECIMAL(10, 2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE public.reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  images       TEXT[],
  is_verified  BOOLEAN DEFAULT FALSE,
  is_approved  BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE public.activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEWSLETTER
-- ============================================================

CREATE TABLE public.newsletter_subscribers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT UNIQUE NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANNERS / HERO
-- ============================================================

CREATE TABLE public.banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT NOT NULL,
  link_url    TEXT,
  button_text TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_is_featured ON public.products(is_featured);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_created_at ON public.products(created_at);
CREATE INDEX idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_tags ON public.products USING GIN (tags);

CREATE INDEX idx_product_images_product ON public.product_images(product_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_id);
CREATE INDEX idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON public.cart_items(product_id);
CREATE INDEX idx_wishlist_user ON public.wishlists(user_id);
CREATE INDEX idx_wishlist_product ON public.wishlists(product_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_reviews_product ON public.reviews(product_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);

-- ============================================================
-- VIEWS
-- ============================================================

-- Product summary view with ratings and stock
CREATE OR REPLACE VIEW public.product_summary AS
SELECT
  p.*,
  pi.url AS primary_image,
  c.name AS category_name,
  c.slug AS category_slug,
  b.name AS brand_name,
  b.logo_url AS brand_logo,
  COALESCE(i.quantity, 0) AS stock_quantity,
  COALESCE(i.reserved_qty, 0) AS reserved_quantity,
  COALESCE(i.quantity, 0) - COALESCE(i.reserved_qty, 0) AS available_quantity,
  COALESCE(AVG(r.rating), 0)::DECIMAL(3,2) AS avg_rating,
  COUNT(DISTINCT r.id)::INTEGER AS review_count,
  CASE WHEN p.compare_price > p.price
    THEN ROUND(((p.compare_price - p.price) / p.compare_price * 100)::NUMERIC, 0)
    ELSE 0
  END AS discount_percentage
FROM public.products p
LEFT JOIN public.product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.brands b ON b.id = p.brand_id
LEFT JOIN public.inventory i ON i.product_id = p.id
LEFT JOIN public.reviews r ON r.product_id = p.id AND r.is_approved = TRUE
GROUP BY p.id, pi.url, c.name, c.slug, b.name, b.logo_url, i.quantity, i.reserved_qty;

-- Order summary view
CREATE OR REPLACE VIEW public.order_summary AS
SELECT
  o.*,
  p.full_name AS customer_name,
  p.email AS customer_email,
  p.phone AS customer_phone,
  COUNT(oi.id)::INTEGER AS item_count,
  py.payment_status,
  py.payment_method AS paid_via,
  py.transaction_id
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
LEFT JOIN public.payments py ON py.order_id = o.id
GROUP BY o.id, p.full_name, p.email, p.phone, py.payment_status, py.payment_method, py.transaction_id;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count  INTEGER;
BEGIN
  LOOP
    v_number := 'SV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
    SELECT COUNT(*) INTO v_count FROM public.orders WHERE order_number = v_number;
    EXIT WHEN v_count = 0;
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.carts (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-set order number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update inventory on order
CREATE OR REPLACE FUNCTION public.reserve_inventory()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventory
  SET reserved_qty = reserved_qty + NEW.quantity
  WHERE product_id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Release inventory on cancel
CREATE OR REPLACE FUNCTION public.release_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.inventory i
    SET reserved_qty = GREATEST(0, i.reserved_qty - oi.quantity),
        quantity = i.quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND i.product_id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deduct inventory on delivery
CREATE OR REPLACE FUNCTION public.deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE public.inventory i
    SET reserved_qty = GREATEST(0, i.reserved_qty - oi.quantity),
        quantity = GREATEST(0, i.quantity - oi.quantity)
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND i.product_id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_orders_set_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

CREATE TRIGGER tr_orders_release_inventory
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.release_inventory();

CREATE TRIGGER tr_orders_deduct_inventory
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_inventory();

CREATE TRIGGER tr_cart_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tr_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Addresses policies
CREATE POLICY "Users can manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

-- Cart policies
CREATE POLICY "Users can manage own cart" ON public.carts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cart items" ON public.cart_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE id = cart_items.cart_id AND user_id = auth.uid())
  );

-- Wishlist policies
CREATE POLICY "Users can manage own wishlist" ON public.wishlists
  FOR ALL USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Order items policies
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
  );

-- Reviews policies
CREATE POLICY "Anyone can view approved reviews" ON public.reviews
  FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "Users can manage own reviews" ON public.reviews
  FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- Products, categories, brands are public read
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Public can view brands" ON public.brands
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public can view product images" ON public.product_images
  FOR SELECT USING (TRUE);
CREATE POLICY "Public can view inventory" ON public.inventory
  FOR SELECT USING (TRUE);
CREATE POLICY "Public can view active banners" ON public.banners
  FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('products', 'products', true),
  ('avatars', 'avatars', true),
  ('categories', 'categories', true),
  ('banners', 'banners', true),
  ('reviews', 'reviews', true);

CREATE POLICY "Public product images are viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- ============================================================
-- SEED DATA: Categories
-- ============================================================

INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
  ('Electronics', 'electronics', 'Gadgets, devices and more', '💻', 1),
  ('Fashion', 'fashion', 'Clothing, shoes and accessories', '👗', 2),
  ('Home & Living', 'home-living', 'Furniture and home decor', '🏠', 3),
  ('Sports & Fitness', 'sports-fitness', 'Equipment and activewear', '⚽', 4),
  ('Beauty & Personal Care', 'beauty-personal-care', 'Skincare, haircare and more', '💄', 5),
  ('Books & Education', 'books-education', 'Books, courses and stationery', '📚', 6),
  ('Toys & Games', 'toys-games', 'Toys for all ages', '🎮', 7),
  ('Groceries', 'groceries', 'Fresh and packaged food', '🛒', 8);

-- Sub-categories
INSERT INTO public.categories (name, slug, parent_id, sort_order) VALUES
  ('Smartphones', 'smartphones', (SELECT id FROM public.categories WHERE slug='electronics'), 1),
  ('Laptops', 'laptops', (SELECT id FROM public.categories WHERE slug='electronics'), 2),
  ('Audio', 'audio', (SELECT id FROM public.categories WHERE slug='electronics'), 3),
  ('Cameras', 'cameras', (SELECT id FROM public.categories WHERE slug='electronics'), 4),
  ('Men Clothing', 'men-clothing', (SELECT id FROM public.categories WHERE slug='fashion'), 1),
  ('Women Clothing', 'women-clothing', (SELECT id FROM public.categories WHERE slug='fashion'), 2),
  ('Footwear', 'footwear', (SELECT id FROM public.categories WHERE slug='fashion'), 3);

-- Seed Brands
INSERT INTO public.brands (name, slug, website) VALUES
  ('Apple', 'apple', 'https://apple.com'),
  ('Samsung', 'samsung', 'https://samsung.com'),
  ('Sony', 'sony', 'https://sony.com'),
  ('Nike', 'nike', 'https://nike.com'),
  ('Adidas', 'adidas', 'https://adidas.com'),
  ('OnePlus', 'oneplus', 'https://oneplus.com'),
  ('Dell', 'dell', 'https://dell.com'),
  ('HP', 'hp', 'https://hp.com'),
  ('Boat', 'boat', 'https://boat-lifestyle.com'),
  ('Puma', 'puma', 'https://puma.com');
