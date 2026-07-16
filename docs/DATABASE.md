# ShopVerse Database Documentation

## Overview
- **Platform:** Supabase (PostgreSQL 15)
- **Authentication:** Supabase Auth (built-in)
- **Storage:** Supabase Storage
- **Extensions:** uuid-ossp, pg_trgm, unaccent

## Schema Setup
Run `docs/schema.sql` in your Supabase SQL Editor.

---

## Tables Reference

### `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on signup.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | References auth.users(id) |
| email | TEXT | Unique email |
| full_name | TEXT | User's full name |
| role | ENUM | customer / admin / moderator |
| is_active | BOOLEAN | Account status |
| avatar_url | TEXT | Storage URL |

### `products`
Core product catalog.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Auto UUID |
| name | TEXT | Product name |
| slug | TEXT | URL-friendly unique identifier |
| price | DECIMAL | Sale price |
| compare_price | DECIMAL | Original price (for discount calc) |
| category_id | UUID FK | → categories |
| brand_id | UUID FK | → brands |
| is_featured | BOOLEAN | Show in featured section |
| is_best_seller | BOOLEAN | Show in best sellers |
| is_flash_sale | BOOLEAN | Show in flash sale |
| specifications | JSONB | Key-value specs |
| tags | TEXT[] | Searchable tags |

### `inventory`
One-to-one with products for stock management.

| Column | Type | Description |
|--------|------|-------------|
| product_id | UUID FK | References products |
| quantity | INTEGER | Total stock |
| reserved_qty | INTEGER | Reserved for pending orders |
| low_stock_alert | INTEGER | Alert threshold (default: 10) |

**Available Stock = quantity - reserved_qty**

### `orders`
| Column | Type | Description |
|--------|------|-------------|
| order_number | TEXT | Auto-generated (SV-YYYYMMDD-NNNNN) |
| status | ENUM | pending/confirmed/packed/shipped/delivered/cancelled |
| shipping_address | JSONB | Snapshot of delivery address |
| total_amount | DECIMAL | Final amount after discounts |

---

## Views

### `product_summary`
Joins products with: primary image, category, brand, inventory, avg rating, review count, discount percentage.

Use this view for all product listing queries.

### `order_summary`  
Joins orders with: customer name/email, item count, payment status.

Use this view for admin order management.

---

## Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| `on_auth_user_created` | auth.users | Creates profile + cart on signup |
| `tr_orders_set_number` | orders | Auto-generates order number |
| `tr_orders_release_inventory` | orders | Restores stock on cancellation |
| `tr_orders_deduct_inventory` | orders | Deducts stock on delivery |
| `tr_*_updated_at` | all tables | Auto-updates updated_at |

---

## RLS Policies Summary

| Table | Policy |
|-------|--------|
| profiles | Users can view/update own only; admins can view all |
| products | Public read (active=true); admin write |
| cart/cart_items | Users can only access own cart |
| wishlists | Users can only access own wishlist |
| orders | Users view own; admins view all |
| reviews | Public read (approved); users write own |

---

## Storage Buckets

| Bucket | Public | Usage |
|--------|--------|-------|
| products | ✅ | Product images |
| avatars | ✅ | User profile pictures |
| categories | ✅ | Category images |
| banners | ✅ | Homepage banners |
| reviews | ✅ | Review images |

---

## Making a User an Admin

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@yoursite.com';
```

## Checking Product Stock

```sql
SELECT 
  p.name,
  i.quantity,
  i.reserved_qty,
  (i.quantity - i.reserved_qty) AS available
FROM products p
JOIN inventory i ON i.product_id = p.id
WHERE i.quantity <= i.low_stock_alert
ORDER BY available ASC;
```
