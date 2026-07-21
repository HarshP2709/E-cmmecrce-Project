# 🛍️ ShopVerse — Industry-Level E-Commerce Platform

> A premium full-stack e-commerce application inspired by Amazon, Flipkart, Apple Store, Nike & Myntra.  
> Built with **HTML5 + CSS3 + Vanilla JavaScript** (frontend) and **Express.js + Supabase PostgreSQL** (backend).

---

## 📸 Screenshots

> The application features glassmorphism UI, smooth animations, dark/light mode, and fully responsive design across all devices.

---

## ✨ Features

### 🛒 Shopping
- Product catalog with advanced search & filters
- Product detail with image gallery, zoom, variants, specifications table
- Shopping cart with coupon codes
- Wishlist management
- One-page checkout with Stripe payments

### 👤 User
- Supabase Authentication (Email + OAuth)
- User profile management with avatar upload
- Address book management
- Order history with live tracking
- Notifications

### 🛡️ Admin Dashboard
- Dashboard with revenue analytics
- Product management (CRUD + image upload)
- Category management
- Order management & status updates
- Customer management
- Revenue charts (Canvas-based, no dependencies)
- Low stock alerts

### 🎨 UI/UX
- Glassmorphism design language
- Dark & Light mode
- Micro-animations & page transitions
- Skeleton loaders
- Hero banner slider with autoplay
- Flash sale countdown timer
- Responsive across all screen sizes
- Accessible (ARIA labels, keyboard navigation)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6 Modules) |
| **Backend** | Node.js, Express.js |
| **Database** | Supabase PostgreSQL |
| **Authentication** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Payments** | Stripe |
| **Security** | Helmet, CORS, Rate Limiting, JWT |

---

## 📁 Project Structure

```
shopverse/
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── variables.css      ← Design tokens & dark mode
│   │   │   ├── base.css           ← Reset & utilities
│   │   │   ├── components.css     ← Buttons, forms, modals
│   │   │   ├── navbar.css         ← Navigation & mega menu
│   │   │   ├── products.css       ← Product cards & grids
│   │   │   ├── home.css           ← Hero, categories, flash sale
│   │   │   ├── pages.css          ← Cart, checkout, auth, admin
│   │   │   ├── footer.css         ← Footer
│   │   │   └── animations.css     ← All transitions & effects
│   │   ├── js/
│   │   │   ├── modules/
│   │   │   │   ├── utils.js       ← Shared utilities
│   │   │   │   ├── auth.js        ← Auth module
│   │   │   │   ├── cart.js        ← Cart management
│   │   │   │   ├── products.js    ← Product rendering
│   │   │   │   ├── wishlist.js    ← Wishlist management
│   │   │   │   └── navbar.js      ← Navbar behavior
│   │   │   └── pages/
│   │   │       ├── home.js
│   │   │       ├── products.js
│   │   │       ├── product-detail.js
│   │   │       ├── cart.js
│   │   │       ├── checkout.js
│   │   │       ├── login.js
│   │   │       ├── register.js
│   │   │       ├── profile.js
│   │   │       ├── orders.js
│   │   │       ├── wishlist.js
│   │   │       ├── search.js
│   │   │       ├── order-success.js
│   │   │       ├── forgot-password.js
│   │   │       ├── reset-password.js
│   │   │       └── admin/
│   │   │           ├── dashboard.js
│   │   │           ├── products.js
│   │   │           └── orders.js
│   │   └── images/
│   │       └── placeholder.webp
│   ├── pages/
│   │   ├── products.html
│   │   ├── product-detail.html
│   │   ├── cart.html
│   │   ├── checkout.html
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── profile.html
│   │   ├── orders.html
│   │   ├── wishlist.html
│   │   ├── search.html
│   │   ├── order-success.html
│   │   ├── forgot-password.html
│   │   ├── reset-password.html
│   │   ├── 404.html
│   │   └── admin/
│   │       ├── dashboard.html
│   │       ├── products.html
│   │       └── orders.html
│   └── index.html                 ← Home page
│
├── backend/
│   ├── src/
│   │   ├── server.js              ← Express entry point (port 3000)
│   │   ├── config/
│   │   │   ├── supabase.js        ← Supabase client
│   │   │   ├── stripe.js          ← Stripe client
│   │   │   └── logger.js          ← Winston logger
│   │   ├── controllers/           ← Business logic
│   │   ├── routes/                ← API routes
│   │   ├── middleware/            ← Auth, validation, upload
│   │   └── database/
│   ├── scripts/
│   │   ├── seed_products_csv.js   ← ⭐ Seed from products.csv (simple)
│   │   ├── seed_from_csv.js       ← Seed from docs/data/ (full catalog)
│   │   └── update_images.js       ← Update product images
│   └── package.json
│
├── docs/
│   ├── schema.sql                 ← Complete Supabase schema
│   ├── data/
│   │   └── products.csv           ← ⭐ Product data (7 products with images & specs)
│   ├── API.md                     ← API documentation
│   └── DATABASE.md                ← Database documentation
│
├── .env.example                   ← Environment variables template
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Stripe account (for payments)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/shopverse
cd shopverse
```

### 2. Backend Setup

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

### 3. Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy the contents of `docs/schema.sql`
4. Paste and run the SQL
5. Copy your project URL and API keys to `backend/.env`

### 4. Seed Products from CSV

After the database schema is set up, seed your products with one command:

```bash
cd backend
npm run seed
```

This reads [`docs/data/products.csv`](docs/data/products.csv) and:
- Auto-creates missing categories and brands in the database
- Inserts all 7 products with real Unsplash images
- Attaches product specifications (key-value pairs)
- Seeds customer reviews (requires at least one admin user)
- Sets inventory to 50 units per product

### 5. Frontend Setup

The frontend is pure HTML/CSS/JS — no build step needed!

**Option A — Via the backend server (recommended)**

The Express server already serves the frontend at `localhost:3000`. Just start the backend:
```bash
cd backend
npm run dev
# then open http://localhost:3000
```

**Option B — Live Server (VS Code)**
1. Install the "Live Server" extension
2. Open `frontend/index.html`
3. Click "Go Live"

**Option C — Simple HTTP Server**
```bash
cd frontend
npx serve . -p 8080
```

### 6. Environment Variables

Copy `.env.example` to `backend/.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📦 Products CSV Format

The products data file is at [`docs/data/products.csv`](docs/data/products.csv).

### CSV Columns

| Column | Type | Description |
|---|---|---|
| `id` | number | Local row ID (not used in DB) |
| `title` | string | Product name |
| `brand` | string | Brand name (auto-created if new) |
| `category` | string | Category name (auto-created if new) |
| `price` | number | Selling price in ₹ |
| `description` | string | Full product description |
| `images` | JSON array | Array of image URLs (Unsplash etc.) |
| `specifications` | JSON object | Key-value pairs shown in Specs tab |
| `reviews` | JSON array | Seed reviews with rating & comment |

### Example Row

```csv
id,title,brand,category,price,description,images,specifications,reviews
1,"Apple Premium Shaver Pro","Apple","Personal Care Electronics",6499,"Experience an incredibly close shave...","[""https://images.unsplash.com/...""]","{""Model Number"":""AP-4321"",""Warranty"":""1 Year""}","[{""reviewer_name"":""Amit"",""rating"":5,""comment"":""Best trimmer!""}]"
```

### Images

Images column is a JSON array of URL strings. These are stored in `product_images` table:
- First image → primary image (shown in product card)
- All images → image gallery on product detail page

### Specifications

Specifications column is a JSON object. Keys become the left column, values the right column in the **Specifications** tab on the product detail page:

```json
{
  "Model Number": "AP-4321",
  "Release Year": "2025",
  "Warranty": "1 Year Brand Warranty",
  "Dimensions": "18x6x5 cm",
  "Weight": "0.35 kg",
  "Color": "Space Gray"
}
```

### Reviews

Reviews column is a JSON array. Each review object:

```json
[{
  "reviewer_name": "Amit Sharma",
  "rating": 5,
  "date": "2026-02-14",
  "review_title": "Exceptional Quality",
  "comment": "Best trimmer I have owned."
}]
```

> **Note:** Reviews are seeded using the admin account's user_id. Make sure you have created an admin user before running `npm run seed`.

---

## 📊 Database Schema

The complete normalized schema is in [`docs/schema.sql`](docs/schema.sql).

### Key Tables

| Table | Description |
|---|---|
| `profiles` | User profiles (extends Supabase auth) |
| `products` | Product catalog with `specifications` JSONB |
| `product_images` | Multiple images per product |
| `inventory` | Stock management |
| `categories` | Hierarchical categories |
| `brands` | Brand catalog |
| `carts` + `cart_items` | Shopping cart |
| `wishlists` | User wishlists |
| `orders` + `order_items` | Order management |
| `payments` | Payment records |
| `reviews` | Product reviews |
| `coupons` | Discount codes |
| `notifications` | User notifications |

### Views
- `product_summary` — Products with ratings, stock, category, brand, primary image
- `order_summary` — Orders with customer info and payment status

### Key Features
- UUID primary keys
- Row Level Security (RLS) policies
- Triggers for `updated_at`, order numbers, inventory management
- Full-text search indexes (trigram)
- ENUM types with `IF NOT EXISTS` guards (safe to re-run)

---

## 🔌 API Reference

Base URL: `http://localhost:3000/api/v1`

### Auth
```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/refresh
GET  /auth/me
```

### Products
```
GET  /products                  # List (with filters/pagination)
GET  /products/:slug            # Detail + images + specs + reviews
POST /products                  # Create (admin)
PUT  /products/:id              # Update (admin)
DELETE /products/:id            # Delete (admin)
POST /products/:id/images       # Upload images (admin)
```

### Cart
```
GET    /cart                    # Get user's cart
POST   /cart/items              # Add item
PATCH  /cart/items/:id          # Update quantity
DELETE /cart/items/:id          # Remove item
DELETE /cart/clear              # Clear cart
POST   /cart/coupon             # Apply coupon
```

### Orders
```
GET    /orders                  # User's orders
GET    /orders/:id              # Order detail
POST   /orders                  # Create order
PATCH  /orders/:id/cancel       # Cancel order
PATCH  /orders/:id/status       # Update status (admin)
```

### Payments
```
POST /payments/create-intent    # Create Stripe PaymentIntent
POST /payments/confirm          # Confirm payment
POST /payments/webhook          # Stripe webhook
```

### Users
```
GET    /users/profile           # Get profile
PUT    /users/profile           # Update profile
POST   /users/avatar            # Upload avatar
GET    /users/addresses         # Get addresses
POST   /users/addresses         # Add address
PUT    /users/addresses/:id     # Update address
DELETE /users/addresses/:id     # Delete address
GET    /users/notifications     # Get notifications
```

### Admin
```
GET    /admin/dashboard         # Stats + recent activity
GET    /admin/users             # All users
PATCH  /admin/users/:id/toggle  # Block/unblock user
GET    /admin/orders            # All orders
GET    /admin/analytics/revenue # Revenue data
```

---

## 🔐 Security Features

- ✅ Supabase Row Level Security (RLS)
- ✅ JWT authentication with refresh tokens
- ✅ Helmet.js security headers
- ✅ Rate limiting (100 req/15min, 20 auth req/15min)
- ✅ CORS configuration
- ✅ Input validation (express-validator)
- ✅ XSS protection
- ✅ File upload validation (type + size)
- ✅ Password strength enforcement
- ✅ Environment variables for secrets

---

## 🎨 Design System

```css
/* Primary Colors */
--color-primary: #6c63ff       /* Indigo/Purple */
--color-secondary: #ff6584     /* Pink/Red */
--color-accent: #43e97b        /* Green */

/* Typography */
Font: -apple-system, Segoe UI, Roboto, Inter

/* Border Radius */
--border-radius: 12px
--border-radius-lg: 16px
--border-radius-xl: 24px
--border-radius-pill: 50px
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Target |
|---|---|
| `> 1280px` | Large desktop |
| `1024–1280px` | Desktop |
| `768–1024px` | Tablet |
| `480–768px` | Mobile landscape |
| `< 480px` | Mobile portrait |

---

## 👨‍💻 Development Notes

### Seed Commands

| Command | Description |
|---|---|
| `npm run seed` | Seed from `docs/data/products.csv` (7 products) |
| `npm run seed:full` | Seed from full `docs/data/` folder (hundreds of products) |

### Adding Products via CSV

1. Edit `docs/data/products.csv`
2. Add a new row with all columns filled
3. Run `cd backend && npm run seed`

### Adding a Product via Admin UI

1. Login with admin credentials
2. Navigate to `/pages/admin/dashboard.html`
3. Go to Products → Add Product
4. Fill details, upload images
5. Set stock in Inventory field

### Creating an Admin User

1. Register a normal account via the signup page
2. Run this SQL in Supabase SQL Editor:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your@email.com';
```

### Stripe Test Cards
```
Success:   4242 4242 4242 4242
Decline:   4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

---

## 🗂️ Current Product Catalog (products.csv)

| # | Product | Brand | Category | Price |
|---|---|---|---|---|
| 1 | Apple Premium Shaver Pro | Apple | Personal Care Electronics | ₹6,499 |
| 2 | Sony Bravia Ultra Cinema TV | Sony | TV & Home Entertainment | ₹89,999 |
| 3 | Dell Precision Book Pro | Dell | Computers & Laptops | ₹1,14,999 |
| 4 | Samsung Odyssey Horizon Console | Samsung | Gaming & VR | ₹45,999 |
| 5 | OnePlus Smart Juicer Pro | OnePlus | Kitchen Appliances | ₹3,499 |
| 6 | Nike Air Max Flex Runner | Nike | Fashion | ₹8,499 |
| 7 | boAt Rockerz Bass Headset | boAt | Electronics | ₹1,999 |

Each product includes:
- ✅ 2–4 real Unsplash product images
- ✅ Full description paragraph
- ✅ Specifications table (Model, Year, Warranty, Dimensions, Weight, Color)
- ✅ 1 seed customer review

---

## 📄 License

MIT License — Free to use for educational/internship purposes.

---

## 🙏 Credits

Built with ❤️ using:
- [Supabase](https://supabase.com) — Backend as a service
- [Express.js](https://expressjs.com) — Web framework
- [Stripe](https://stripe.com) — Payment processing
- Design inspired by Amazon, Flipkart, Apple Store, Nike, Myntra

---

*Made for internship submission — Production-grade full-stack e-commerce platform.*
