# 🌱 Seed Data Guide

## Overview

This guide explains how to populate the ShopVerse Supabase database with dummy product data from the included CSV files.

The seed data covers **22 product categories** with **100 products each** (2,100+ products total), all brands, and categories — fully wired to Supabase.

---

## File Structure

```
docs/
├── SEED_DATA.md              ← This guide
├── DATABASE.md               ← Database schema documentation
├── API.md                    ← API documentation
├── schema.sql                ← Full Supabase SQL schema
└── data/                     ← All CSV seed files
    ├── categories.csv         ← 22 categories
    ├── brands.csv             ← 70 brands
    │
    ├── products_tv_home_entertainment.csv    (cat-01 | 100 products)
    ├── products_computers_laptops.csv        (cat-02 | 100 products)
    ├── products_mobiles_tablets_wearables.csv(cat-03 | 100 products)
    ├── products_personal_care_electronics.csv(cat-04 | 100 products)
    ├── products_gaming_vr.csv                (cat-05 | 100 products)
    ├── products_kitchen_appliances.csv       (cat-06 | 100 products)
    ├── products_home_living.csv              (cat-07 | 100 products)
    ├── products_major_home_appliances.csv    (cat-08 | 100 products)
    ├── products_smart_home_security.csv      (cat-09 | 100 products)
    ├── products_cameras_photography.csv      (cat-10 | 100 products)
    ├── products_smartphones.csv              (cat-11 | 100 products)
    ├── products_electronics.csv              (cat-12 | 100 products)
    ├── products_laptops.csv                  (cat-13 | 100 products)
    ├── products_fashion.csv                  (cat-14 | 100 products)
    ├── products_audio.csv                    (cat-15 | 100 products)
    ├── products_sports_fitness.csv           (cat-17 | 100 products)
    ├── products_beauty_personal_care.csv     (cat-18 | 100 products)
    ├── products_books_education.csv          (cat-19 | 100 products)
    ├── products_toys_games.csv               (cat-20 | 100 products)
    ├── products_groceries.csv                (cat-21 | 100 products)
    └── products_watches_wearables.csv        (cat-22 | 100 products)

backend/
└── scripts/
    ├── generate_dummy_data.js  ← STEP 1: Re-generate all CSVs (optional)
    ├── seed_from_csv.js        ← STEP 2: Import CSV data into Supabase
    └── update_images.js        ← STEP 3: Attach real Unsplash photos
```

---

## Prerequisites

1. **Supabase project** already set up with the schema from [`docs/schema.sql`](./schema.sql)
2. **Environment variables** set in `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. **Node.js** v18+ and `npm install` already run in `backend/`

> No extra packages needed — the seed script uses only Node.js built-ins plus `@supabase/supabase-js` and `dotenv` which are already in `package.json`.

---

## Running the Seed Scripts

Run all three steps in order from the project root:

```bash
# Step 1 – (optional) Regenerate CSV files with fresh data
node backend/scripts/generate_dummy_data.js

# Step 2 – Import all CSV data into Supabase
node backend/scripts/seed_from_csv.js

# Step 3 – Attach real Unsplash product photos (5 per product)
node backend/scripts/update_images.js
```

> Steps 2 and 3 require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.

### Expected Output

```
🚀 ShopVerse CSV Seed Script
════════════════════════════

📂 Seeding categories...
  ✓ 22 categories upserted

🏷️  Seeding brands...
  ✓ 70 brands upserted

  📋 Resolved 22 category IDs
  📋 Resolved 70 brand IDs

📦 Seeding products...
  ✓ products_tv_home_entertainment.csv: 100 inserted/updated, 0 skipped
  ✓ products_computers_laptops.csv: 100 inserted/updated, 0 skipped
  ... (20 files total)

✅ Seed complete in 45.2s
```

> The script is **idempotent** — running it multiple times will upsert (update or insert) without creating duplicate rows.

---

## What Gets Seeded

### Categories (22)

| ID     | Name                            | Slug                          |
|--------|---------------------------------|-------------------------------|
| cat-01 | TV & Home Entertainment         | tv-home-entertainment         |
| cat-02 | Computers & Laptops             | computers-laptops             |
| cat-03 | Mobiles, Tablets & Wearables    | mobiles-tablets-wearables     |
| cat-04 | Personal Care Electronics       | personal-care-electronics     |
| cat-05 | Gaming & VR                     | gaming-vr                     |
| cat-06 | Kitchen Appliances              | kitchen-appliances            |
| cat-07 | Home & Living                   | home-living                   |
| cat-08 | Major Home Appliances           | major-home-appliances         |
| cat-09 | Smart Home & Security           | smart-home-security           |
| cat-10 | Cameras & Photography           | cameras-photography           |
| cat-11 | Smartphones                     | smartphones                   |
| cat-12 | Electronics                     | electronics                   |
| cat-13 | Laptops                         | laptops                       |
| cat-14 | Fashion                         | fashion                       |
| cat-15 | Audio                           | audio                         |
| cat-16 | Cameras                         | cameras                       |
| cat-17 | Sports & Fitness                | sports-fitness                |
| cat-18 | Beauty & Personal Care          | beauty-personal-care          |
| cat-19 | Books & Education               | books-education               |
| cat-20 | Toys & Games                    | toys-games                    |
| cat-21 | Groceries                       | groceries                     |
| cat-22 | Watches & Wearables             | watches-wearables             |

### Brands (70)

Key brands include Apple, Samsung, Sony, OnePlus, Xiaomi, Realme, OPPO, Vivo, Google, Motorola, Dell, HP, Lenovo, Asus, Acer, Nike, Adidas, Puma, Reebok, Under Armour, and many more Indian and international brands.

### Products

- **Total**: 2,100 products across 21 CSV files
- **All products**: `is_active = true`, `condition = "new"`, `stock` = 10–500 (random)
- **Pricing**: USD
- **Tags**: JSON array in CSV → stored as `TEXT[]` in Postgres
- **Specifications**: JSON object → stored as `JSONB` in Postgres
- **Images**: 5 real Unsplash photos per product (added by `update_images.js`)

### Per-Product Database Records

For each product row the script inserts:

1. **`products`** — core product data (name, slug, price, tags, specifications, etc.)
2. **`inventory`** — `quantity` from CSV, `reserved_qty = 0`
3. **`product_images`** — 5 picsum placeholder images (primary + 4 alternates)

Then `update_images.js` replaces the placeholders with real Unsplash photos.

---

## CSV Column Reference

| Column          | Type    | Description                                              |
|-----------------|---------|----------------------------------------------------------|
| `sku`           | string  | Unique product code e.g. `SM-001`                       |
| `name`          | string  | Full product name                                        |
| `slug`          | string  | URL-friendly unique identifier                           |
| `category_id`   | string  | Short ID e.g. `cat-11` (resolved to UUID by script)     |
| `brand_id`      | string  | Short ID e.g. `br-01` (resolved to UUID by script)      |
| `price`         | number  | Selling price in INR                                     |
| `compare_price` | number  | Original/MRP price in INR                               |
| `short_desc`    | string  | One-line product summary (≤ 120 chars)                  |
| `description`   | string  | Full product description                                 |
| `tags`          | JSON    | JSON array e.g. `["smartphone","5g","android"]`         |
| `specifications`| JSON    | JSON object e.g. `{"ram":"16GB","storage":"512GB"}`     |
| `is_featured`   | boolean | Show in featured section                                 |
| `is_best_seller`| boolean | Show in best sellers                                     |
| `is_new_arrival`| boolean | Show in new arrivals                                     |
| `is_flash_sale` | boolean | Show in flash sale                                       |
| `stock`         | integer | Initial inventory quantity (all ≥ 50)                   |
| `condition`     | string  | Product condition — always `"new"` in seed data          |

---

## Troubleshooting

### "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
Make sure `backend/.env` exists with both variables set.

### "Failed to fetch categories"
Run the categories seed first, or ensure the `categories` table exists in Supabase (see `docs/schema.sql`).

### Slow execution
The script processes products sequentially to avoid rate limits. Expect ~60–120 seconds for all 2,100 products.

### Duplicate slug errors
The script uses `upsert` with `onConflict: 'slug'` so re-running is safe. If you need a clean start, truncate the tables first:

```sql
TRUNCATE product_images, inventory, products, brands, categories CASCADE;
```

---

## Adding More Products

1. Create a new CSV file in `docs/data/` following the same column format.
2. Add a new entry to the `productFiles` array in [`backend/scripts/seed_from_csv.js`](../backend/scripts/seed_from_csv.js).
3. Re-run the seed script.
