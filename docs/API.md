# OpenClaw Café API Documentation

This document describes the current HTTP and WebSocket API exposed by the OpenClaw Café backend.

## Base URL

Examples assume:

- Backend: `http://127.0.0.1:8081`
- Frontend (dev): `http://127.0.0.1:5173`

## Authentication

Protected endpoints require a bearer token:

```http
Authorization: Bearer <token>
```

There are now two valid operator auth paths in the backend:

1. **Legacy `staff_users.auth_token` bearer tokens**
2. **Role-scoped operator login IDs + secrets**, exchanged via `POST /auth/operator/login` for an `operator_sessions.session_token`

Fresh databases still seed the legacy `staff_users` rows first:

- Owner: `owner-demo-token`
- Staff: `staff-demo-token`
- Kitchen: `kitchen-demo-token`

On startup, `ensure_operator_credentials()` guarantees one active operator credential per role:

- If a legacy `staff_users` row exists for the role, the backend creates an operator credential from it.
- If that legacy row has no `login_id`, the backend uses `<role>-legacy` (`admin-legacy`, `staff-legacy`, `kitchen-legacy`).
- If that legacy row has no `password_hash`, the operator secret is the existing legacy `auth_token` value.
- Only when no legacy row exists at all does the backend bootstrap a brand-new random login ID + secret pair.

So on a stock fresh DB, the first usable operator credentials are:

- Admin: login ID `admin-legacy`, secret `owner-demo-token`
- Staff: login ID `staff-legacy`, secret `staff-demo-token`
- Kitchen: login ID `kitchen-legacy`, secret `kitchen-demo-token`

After that, owners can rotate a role credential with `POST /admin/operator-credentials/reset`. The new secret is returned **only in that reset response**, so it must be copied immediately.

## Money format

Monetary values are integer minor units (for example cents).

- `450` = `$4.50`
- `1234500` = `$12,345.00`

## Endpoint groups

- Public / customer
- Admin / owner
- Kitchen / staff
- WebSocket

---

## Public / Customer Endpoints

### GET `/health`
Health check.

**Response**
```json
{"status":"ok"}
```

### GET `/cafe-settings`
Returns public-facing café settings plus managed table preview and table access metadata.

**Response shape**
```json
{
  "name": "OpenClaw Café",
  "legal_name": "OpenClaw Café",
  "slug": "openclaw-cafe",
  "tagline": "Fast café ordering for customers, kitchen, and staff.",
  "image_url": "",
  "currency_code": "USD",
  "primary_color": "#2563EB",
  "accent_color": "#F59E0B",
  "support_email": "",
  "support_phone": "",
  "address_line_1": "",
  "address_line_2": "",
  "city": "",
  "state_region": "",
  "postal_code": "",
  "country_code": "US",
  "timezone": "America/New_York",
  "service_mode": "table_service",
  "table_count": 12,
  "table_prefix": "Table",
  "table_name_style": "numeric",
  "table_name_preview": ["Table 1", "Table 2"],
  "table_access": []
}
```

### GET `/table-tokens/{token}`
Resolve a table token to a table record.

### GET `/table-tokens/{token}/menu`
Fetch customer menu using a table token.

### GET `/tables/{id}/menu`
Fetch customer menu using a table UUID.

**Customer menu response**
```json
{
  "hot_picks": [
    {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      "name": "Espresso",
      "description": "",
      "image_url": "",
      "price": 300,
      "category": "coffee",
      "active": true,
      "available": true,
      "stock_count": 40,
      "low_stock_threshold": 8,
      "restock_needed": false
    }
  ],
  "menu": [],
  "recommendations": []
}
```

### POST `/orders`
Create a customer order using a table UUID.

**Request**
```json
{
  "table_id": "11111111-1111-1111-1111-111111111111",
  "items": [
    {
      "menu_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      "quantity": 2
    }
  ]
}
```

### POST `/orders/by-token`
Create a customer order using a table token.

**Request**
```json
{
  "token": "table-1-qr",
  "items": [
    {
      "menu_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      "quantity": 2
    }
  ]
}
```

### GET `/orders/{id}`
Fetch order status and items.

**Response**
```json
{
  "order": {
    "id": "6dc014d0-7f0b-4db3-b790-33d6f58d0f52",
    "table_id": "11111111-1111-1111-1111-111111111111",
    "table_name": "Table 1",
    "status": "pending",
    "created_at": "2026-04-03T19:00:00Z",
    "paid_at": null
  },
  "items": [
    {
      "id": "8dc014d0-7f0b-4db3-b790-33d6f58d0f52",
      "order_id": "6dc014d0-7f0b-4db3-b790-33d6f58d0f52",
      "menu_item_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      "quantity": 2,
      "menu_item_name": "Espresso",
      "menu_item_category": "coffee",
      "menu_item_price": 300
    }
  ]
}
```

---

## Operator Login Endpoints

### POST `/auth/operator/login`

Exchange a role-specific login ID + secret for a session bearer token.

**Request**
```json
{
  "role": "staff",
  "login_id": "staff-legacy",
  "secret": "staff-demo-token"
}
```

**Response**
```json
{
  "role": "staff",
  "login_id": "staff-legacy",
  "session_token": "ops_..."
}
```

Use the returned `session_token` as the bearer token for subsequent protected calls.

## Admin / Owner Endpoints

These require an active owner bearer token. That can be either the legacy owner bearer token or an owner operator session token.

### GET `/orders`
List all orders.

### GET `/admin/revenue`
Revenue summary.

**Response**
```json
{
  "total_revenue": 24500,
  "order_count": 8,
  "average_order_value": 3062
}
```

### GET `/admin/analytics`
Analytics summary including monthly revenue, monthly profit/loss, and peak hours.

**Response**
```json
{
  "monthly_revenue": [
    {
      "month": "2026-04",
      "revenue": 24500,
      "order_count": 8
    }
  ],
  "monthly_profit_loss": [
    {
      "month": "2026-04",
      "revenue": 24500,
      "costs": 12300,
      "profit": 12200,
      "margin_percent": 49.8,
      "order_count": 8
    }
  ],
  "peak_hours": [
    {
      "hour": 9,
      "order_count": 12,
      "revenue": 9800
    }
  ]
}
```

### GET `/admin/expenses`
List saved monthly operating expenses.

**Response**
```json
[
  {
    "month": "2026-04",
    "rent": 120000,
    "payroll": 500000,
    "utilities": 45000,
    "marketing": 30000,
    "misc": 10000,
    "notes": "April baseline"
  }
]
```

### PUT `/admin/expenses`
Create or update monthly operating expenses.

**Request**
```json
{
  "month": "2026-04",
  "rent": 120000,
  "payroll": 500000,
  "utilities": 45000,
  "marketing": 30000,
  "misc": 10000,
  "notes": "April baseline"
}
```

**Response**
```json
{
  "month": "2026-04",
  "rent": 120000,
  "payroll": 500000,
  "utilities": 45000,
  "marketing": 30000,
  "misc": 10000,
  "notes": "April baseline"
}
```

### POST `/orders/manual`
Create a manual order from the admin side.

Request body matches `POST /orders`.

### PATCH `/admin/cafe-settings`
Update café settings.

### GET `/admin/tables`
List admin table access artifacts.

### GET `/admin/tables/operations`
List operational table summaries.

### GET `/admin/categories`
List menu categories.

### POST `/admin/categories`
Create category.

**Request**
```json
{
  "name": "dessert",
  "hot_pick": false
}
```

### PATCH `/admin/categories/{id}`
Update category.

**Request**
```json
{
  "name": "coffee",
  "hot_pick": true,
  "active": true,
  "sort_order": 10
}
```

### POST `/admin/categories/{id}/archive`
Archive a category.

### GET `/admin/menu-items`
List menu items.

### POST `/admin/menu-items`
Create a menu item.

**Request**
```json
{
  "name": "Latte",
  "description": "Milk coffee",
  "image_url": "",
  "price": 550,
  "category": "coffee"
}
```

### PATCH `/admin/menu-items/{id}`
Update a menu item.

### POST `/admin/menu-items/{id}/archive`
Archive a menu item.

### PATCH `/admin/menu-items/{id}/availability`
Toggle menu item availability.

**Request**
```json
{
  "available": true
}
```

### GET `/admin/inventory`
Owner inventory summary.

### GET `/admin/operator-credentials`
List the current active role credential login IDs for admin/owner, kitchen, and staff.

**Important:** this endpoint does **not** return the current secret, only the login ID and a masked preview field.

### POST `/admin/operator-credentials/reset`
Rotate one role credential and revoke active sessions for that role.

**Request**
```json
{
  "role": "staff"
}
```

**Response**
```json
{
  "role": "staff",
  "login_id": "staff-ab12cd",
  "secret": "newly-issued-secret"
}
```

This reset response is the only API path that returns the newly generated secret.

---

## Kitchen / Staff Endpoints

### GET `/inventory`
List inventory-visible menu items for kitchen/staff/owner.

### PATCH `/inventory/{id}`
Update inventory fields.

**Request**
```json
{
  "stock_count": 25,
  "low_stock_threshold": 5,
  "restock_needed": false,
  "available": true
}
```

### GET `/kitchen/orders`
List active kitchen orders.

### PATCH `/orders/{id}/status`
Update order status.

**Request**
```json
{
  "status": "ready"
}
```

### GET `/staff/open-tables`
List open tables with totals and statuses.

### GET `/staff/tables`
List operational table summaries for staff.

### POST `/staff/tables/{id}/settle`
Mark all open orders for a table as paid.

---

## WebSocket

### GET `/ws/orders`
Order event stream for real-time updates.

Example messages:

```json
{"type":"new_order","order_id":"6dc014d0-7f0b-4db3-b790-33d6f58d0f52","table_id":"11111111-1111-1111-1111-111111111111","status":"pending"}
```

```json
{"type":"order_status_updated","order_id":"6dc014d0-7f0b-4db3-b790-33d6f58d0f52","status":"ready"}
```

---

## Error format

Errors return JSON:

```json
{
  "error": "bad request: month must use YYYY-MM format"
}
```

Typical statuses:

- `400` bad request
- `401` unauthorized
- `404` not found
- `500` internal/database error

---

## Notes

- CORS must allow your frontend origin if you are testing over LAN.
- Expense saving uses `PUT /admin/expenses`, so `PUT` must be allowed in CORS.
- Profit/loss values depend on `menu_items.estimated_cost` and `monthly_expenses`.
