# ShopVerse API Documentation

## Base URL
```
Development: http://localhost:5000/api/v1
Production:  https://api.shopverse.in/api/v1
```

## Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

## Response Format
```json
{
  "success": true | false,
  "message": "Human readable message",
  "data": {} | [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Error Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Validation Failed |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## Auth Endpoints

### POST /auth/register
Register a new user account.

**Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully!",
  "user": { "id": "uuid", "email": "john@example.com" }
}
```

---

### POST /auth/login
Login with email and password.

**Body:**
```json
{ "email": "john@example.com", "password": "SecurePass@123" }
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "customer"
  }
}
```

---

## Product Endpoints

### GET /products
Get paginated list of products with filters.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| category | string | Category slug |
| brand | string | Brand name |
| min_price | number | Minimum price |
| max_price | number | Maximum price |
| rating | number | Minimum average rating |
| sort | string | newest, price_asc, price_desc, rating |
| featured | boolean | Featured products only |
| best_seller | boolean | Best sellers only |
| flash_sale | boolean | Flash sale items only |
| new_arrival | boolean | New arrivals only |
| search | string | Text search |

---

### GET /products/:slug
Get full product details including images, variants, reviews.

---

## Order Endpoints

### POST /orders
Create a new order.

**Body:**
```json
{
  "shipping_address": {
    "full_name": "John Doe",
    "phone": "9876543210",
    "address_line1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postal_code": "400001",
    "country": "India"
  },
  "payment_method": "stripe | cod | upi",
  "items": [
    { "product_id": "uuid", "quantity": 2, "variant_id": null }
  ],
  "coupon_id": "uuid or null",
  "notes": "Optional delivery notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully!",
  "data": {
    "id": "uuid",
    "order_number": "SV-20241201-00001",
    "status": "pending",
    "total_amount": 1999
  }
}
```

---

## Payment Endpoints

### POST /payments/create-intent
Create Stripe PaymentIntent for an order.

**Body:** `{ "order_id": "uuid" }`

**Response:** `{ "client_secret": "pi_..._secret_..." }`

---

### POST /payments/confirm
Confirm payment after Stripe payment completes.

**Body:**
```json
{
  "payment_intent_id": "pi_...",
  "order_id": "uuid"
}
```
