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

---

## Seed Data & CSV Files

> 📖 For full seeding instructions see **[SEED_DATA.md](./SEED_DATA.md)**

### Seed File Structure

```
docs/
├── SEED_DATA.md                              ← Seeding guide
├── DATABASE.md                               ← This file
├── schema.sql                                ← Supabase schema
└── data/                                     ← CSV seed files
    ├── categories.csv                         22 categories
    ├── brands.csv                             70 brands
    │
    ├── products_tv_home_entertainment.csv     cat-01 | 100 products
    ├── products_computers_laptops.csv         cat-02 | 100 products
    ├── products_mobiles_tablets_wearables.csv cat-03 | 100 products
    ├── products_personal_care_electronics.csv cat-04 | 100 products
    ├── products_gaming_vr.csv                 cat-05 | 100 products
    ├── products_kitchen_appliances.csv        cat-06 | 100 products
    ├── products_home_living.csv               cat-07 | 100 products
    ├── products_major_home_appliances.csv     cat-08 | 100 products
    ├── products_smart_home_security.csv       cat-09 | 100 products
    ├── products_cameras_photography.csv       cat-10 | 100 products
    ├── products_smartphones.csv               cat-11 | 100 products
    ├── products_electronics.csv               cat-12 | 100 products
    ├── products_laptops.csv                   cat-13 | 100 products
    ├── products_fashion.csv                   cat-14 | 100 products
    ├── products_audio.csv                     cat-15 | 100 products
    ├── products_sports_fitness.csv            cat-17 | 100 products
    ├── products_beauty_personal_care.csv      cat-18 | 100 products
    ├── products_books_education.csv           cat-19 | 100 products
    ├── products_toys_games.csv                cat-20 | 100 products
    └── products_groceries.csv                 cat-21 | 100 products

backend/
└── scripts/
    └── seed_from_csv.js                      ← Seed script (run with node)
```

### Quick Start — Run the Seed

```bash
# From project root:
node backend/scripts/seed_from_csv.js
```

All 2,000+ products will be inserted into Supabase with inventory and placeholder images. The script is idempotent — safe to run multiple times.
