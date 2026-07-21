# ShopVerse — Project File Structure

## Overview
Full-stack e-commerce platform built with Node.js/Express backend and vanilla JS frontend, backed by Supabase (PostgreSQL).

---

## Root Directory

```
E-cmmecrce Project/
├── backend/                    ← Node.js + Express API server
├── frontend/                   ← Vanilla JS / HTML / CSS storefront
├── docs/                       ← Documentation & seed data
├── package.json                ← Root package (if monorepo scripts)
└── README.md
```

---

## `/docs` — Documentation & Database Seed Data

```
docs/
├── FILE_STRUCTURE.md           ← This file — project structure overview
├── API.md                      ← REST API endpoint documentation
├── DATABASE.md                 ← Database schema, tables, views reference
├── SEED_DATA.md                ← How to seed the database; data descriptions
├── schema.sql                  ← Full Supabase/PostgreSQL DDL (tables, views, RLS)
│
└── data/                       ← CSV seed data files (import into Supabase)
    ├── categories.csv                          ← 22 categories
    ├── brands.csv                              ← 59 brands
    │
    ├── products_tv_home_entertainment.csv      ← 100 TV & audio products (cat-01)
    ├── products_computers_laptops.csv          ← 100 desktop PCs & accessories (cat-02)
    ├── products_mobiles_tablets_wearables.csv  ← 100 phones, tablets, bands (cat-03)
    ├── products_personal_care_electronics.csv  ← 100 grooming devices (cat-04)
    ├── products_gaming_vr.csv                  ← 100 consoles, controllers, VR (cat-05)
    ├── products_kitchen_appliances.csv         ← 100 kitchen gadgets (cat-06)
    ├── products_home_living.csv                ← 100 furniture & décor (cat-07)
    ├── products_major_home_appliances.csv      ← 100 refrigerators, ACs, washers (cat-08)
    ├── products_smart_home_security.csv        ← 100 smart speakers, cameras, locks (cat-09)
    ├── products_cameras_photography.csv        ← 100 cameras & accessories (cat-10 & cat-16)
    ├── products_smartphones.csv                ← 100 smartphones (cat-11)
    ├── products_electronics.csv                ← 100 general electronics (cat-12)
    ├── products_laptops.csv                    ← 100 laptops & accessories (cat-13)
    ├── products_fashion.csv                    ← 100 clothing & shoes (cat-14)
    ├── products_audio.csv                      ← 100 headphones & speakers (cat-15)
    ├── products_sports_fitness.csv             ← 100 gym & sports gear (cat-17)
    ├── products_beauty_personal_care.csv       ← 100 skincare & cosmetics (cat-18)
    ├── products_books_education.csv            ← 100 books & stationery (cat-19)
    ├── products_toys_games.csv                 ← 100 toys & board games (cat-20)
    ├── products_groceries.csv                  ← 100 grocery items (cat-21)
    └── products_watches_wearables.csv          ← 100 smartwatches & bands (cat-22)
```

**Totals:** 2,100 products across 21 CSV files (22 categories).

### CSV Column Reference

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Short ID (e.g. `prod-01001`) used only for CSV cross-referencing |
| `name` | string | Product display name |
| `slug` | string | URL-safe unique identifier |
| `description` | string | Full product description |
| `price` | number | Selling price (USD) |
| `compare_price` | number | Original/crossed-out price (optional) |
| `category_id` | string | Category short ID (e.g. `cat-11`) → resolved to UUID on import |
| `brand_id` | string | Brand short ID (e.g. `b-10`) → resolved to UUID on import |
| `sku` | string | Stock keeping unit code |
| `stock` | number | Initial inventory quantity (10–500) |
| `weight` | number | Product weight in kg |
| `is_featured` | bool | Show on featured sections |
| `is_best_seller` | bool | Badge: Best Seller |
| `is_flash_sale` | bool | Badge: Flash Sale |
| `is_new_arrival` | bool | Badge: New Arrival |
| `tags` | JSON array | Search/filter tags e.g. `["smartphone","5g"]` |
| `specifications` | JSON object | Category-specific specs e.g. `{"ram":"16GB","storage":"512GB"}` |

---

## `/backend` — API Server

```
backend/
├── .env                        ← Environment variables (not committed)
├── package.json
├── server.js                   ← Express entry point
│
├── src/
│   ├── config/
│   │   └── supabase.js         ← Supabase client initialisation
│   │
│   ├── controllers/
│   │   ├── product.controller.js    ← GET/POST/PUT/DELETE products
│   │   ├── category.controller.js   ← Category listing
│   │   ├── auth.controller.js       ← Auth (login/register/profile)
│   │   ├── cart.controller.js       ← Cart operations
│   │   ├── order.controller.js      ← Order management
│   │   ├── review.controller.js     ← Product reviews
│   │   └── admin.controller.js      ← Admin dashboard stats
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js        ← JWT + Supabase session check
│   │   └── error.middleware.js       ← Global error handler + AppError
│   │
│   └── routes/
│       ├── product.routes.js
│       ├── category.routes.js
│       ├── auth.routes.js
│       ├── cart.routes.js
│       ├── order.routes.js
│       ├── review.routes.js
│       └── admin.routes.js
│
└── scripts/
    ├── generate_dummy_data.js   ← STEP 1: Generate all CSV files (run locally)
    ├── seed_from_csv.js         ← STEP 2: Import CSV data into Supabase
    ├── update_images.js         ← STEP 3: Replace images with real Unsplash photos
    ├── seed_electronics_taxonomy.js  ← Legacy: early electronics seeder
    ├── generate_and_seed_csv.js      ← Legacy: combined generator
    ├── dummy_products.csv            ← Legacy: old dummy data
    └── electronics_taxonomy.csv      ← Legacy: electronics taxonomy
```

---

## `/frontend` — Storefront

```
frontend/
├── index.html                   ← Homepage
├── pages/
│   ├── product-detail.html      ← Single product page
│   ├── category.html            ← Category/filter listing
│   ├── categories.html          ← All categories grid
│   ├── cart.html                ← Shopping cart
│   ├── checkout.html            ← Checkout flow
│   ├── account.html             ← User account
│   ├── login.html               ← Login / Register
│   └── search.html              ← Search results
│
└── assets/
    ├── css/
    │   ├── main.css             ← Global styles
    │   └── components.css       ← Reusable component styles
    │
    ├── js/
    │   ├── app.js               ← Entry point, router init
    │   └── modules/
    │       ├── products.js      ← renderProductCard(), product list
    │       ├── utils.js         ← lazyLoadImages(), helpers
    │       ├── cart.js          ← Cart state & UI
    │       ├── auth.js          ← Auth state
    │       ├── api.js           ← Fetch wrapper for backend API
    │       └── filters.js       ← Filter panel logic
    │
    └── images/
        └── placeholder.webp     ← Fallback shown while images load
```

---

## Database Tables (Supabase/PostgreSQL)

| Table | Rows (after seed) | Description |
|-------|:-----------------:|-------------|
| `categories` | 22 | Product categories with parent/child hierarchy |
| `brands` | 59 | Product brands |
| `products` | ~2,100 | All products |
| `product_images` | ~10,500 | 5 images per product (1 primary + 4 alternates) |
| `inventory` | ~2,100 | Stock quantity per product |
| `profiles` | dynamic | User profiles (via Supabase Auth) |
| `orders` | dynamic | Customer orders |
| `order_items` | dynamic | Line items per order |
| `cart_items` | dynamic | Active cart items per user |
| `reviews` | dynamic | Product reviews & ratings |
| `addresses` | dynamic | Saved shipping addresses |
| `product_variants` | dynamic | Size/colour variants |

### Key Views

| View | Description |
|------|-------------|
| `product_summary` | Products joined with `primary_image`, category name/slug, brand name, stock quantity, avg rating, discount % |
| `order_summary` | Orders joined with customer name, item count, payment status |

---

## How to Seed the Database

```bash
# 1. Generate fresh CSV files (optional — already committed to docs/data/)
node backend/scripts/generate_dummy_data.js

# 2. Import all CSV data into Supabase
node backend/scripts/seed_from_csv.js

# 3. Attach real Unsplash product images (5 per product)
node backend/scripts/update_images.js
```

> All three scripts read `backend/.env` for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## Environment Variables (`backend/.env`)

```env
PORT=5000
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

---

*Last updated: auto-generated by ShopVerse seed tooling.*
