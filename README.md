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
- Product detail with image gallery, zoom, variants
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
│   │   ├── server.js              ← Express entry point
│   │   ├── config/
│   │   │   ├── supabase.js        ← Supabase client
│   │   │   ├── stripe.js          ← Stripe client
│   │   │   └── logger.js          ← Winston logger
│   │   ├── controllers/           ← Business logic
│   │   ├── routes/                ← API routes
│   │   ├── middleware/            ← Auth, validation, upload
│   │   └── database/
│   └── package.json
│
├── docs/
│   ├── schema.sql                 ← Complete Supabase schema
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
# Edit .env with your credentials
npm run dev
```

### 3. Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy the contents of `docs/schema.sql`
4. Paste and run the SQL
5. Copy your project URL and API keys to `.env`

### 4. Frontend Setup

The frontend is pure HTML/CSS/JS — no build step needed!

**Option A — Live Server (VS Code)**
1. Install the "Live Server" extension
2. Open `frontend/index.html`
3. Click "Go Live"

**Option B — Simple HTTP Server**
```bash
cd frontend
python -m http.server 3000
# or
npx serve . -p 3000
```

### 5. Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📊 Database Schema

The complete normalized schema is in [`docs/schema.sql`](docs/schema.sql).

### Key Tables

| Table | Description |
|---|---|
| `profiles` | User profiles (extends Supabase auth) |
| `products` | Product catalog |
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
- `product_summary` — Products with ratings, stock, category, brand
- `order_summary` — Orders with customer info and payment status

### Key Features
- UUID primary keys
- Row Level Security (RLS) policies
- Triggers for `updated_at`, order numbers, inventory management
- Full-text search indexes (trigram)

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api/v1`

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
GET  /products/:slug            # Detail + images + reviews
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

### Adding a Product (Admin)
1. Login with admin credentials
2. Navigate to `/pages/admin/dashboard.html`
3. Go to Products → Add Product
4. Fill details, upload images
5. Set stock in Inventory field

### Creating an Admin User
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your@email.com';
```

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

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
