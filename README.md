# OpenClaw Café MVP Backend

Rust backend MVP for chaotic small cafés handling NFC/QR/table ordering.

## Stack
- actix-web for HTTP API
- actix-web-actors for WebSockets
- sqlx + PostgreSQL
- tokio async runtime

## Environment

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost/openclaw_cafe
```

## Run

```bash
export DATABASE_URL=postgres://postgres@localhost/openclaw_cafe
cargo run
```

## Operator credential bootstrap

The backend now supports role-specific operator credentials (`admin`/owner, `staff`, `kitchen`) via `POST /auth/operator/login`.

Important practical detail:

- Fresh DBs still seed legacy `staff_users` bearer tokens first.
- On startup, `ensure_operator_credentials()` converts those legacy rows into operator credentials.
- So a stock fresh DB starts with these operator login pairs:
  - `admin-legacy` / `owner-demo-token`
  - `staff-legacy` / `staff-demo-token`
  - `kitchen-legacy` / `kitchen-demo-token`
- If no legacy row exists for a role, startup bootstraps a brand-new random login ID + secret instead.
- Owners can rotate any role credential with `POST /admin/operator-credentials/reset`; the new secret is only returned in that reset response.

## Payments / cashier behavior

This payment slice currently supports **manual cashier settlement only**.

- `POST /staff/tables/{id}/settle` marks the table's open orders as paid in the app.
- The staff UI can print a bill/receipt window for handoff.
- There is **no Stripe, Square, PayPal, or other payment-provider integration/config in this repo today**.
- The only seeded/demo credentials in this repo are operator access credentials for admin/staff/kitchen login flows.

So if someone asks for payment provider keys or gateway setup, the honest answer is: this repo does not currently ship them because it does not yet implement a real payment processor.

## Example API responses

### GET /tables/:id/menu
```json
[
  {
    "id": "0f15a4a1-11f7-42d9-90a2-0ef76c725d6a",
    "name": "Flat White",
    "price": 450,
    "category": "coffee"
  }
]
```

### POST /orders
```json
{
  "order": {
    "id": "6dc014d0-7f0b-4db3-b790-33d6f58d0f52",
    "table_id": "7dc014d0-7f0b-4db3-b790-33d6f58d0f52",
    "status": "pending",
    "created_at": "2026-04-03T19:00:00Z"
  },
  "items": [
    {
      "id": "8dc014d0-7f0b-4db3-b790-33d6f58d0f52",
      "order_id": "6dc014d0-7f0b-4db3-b790-33d6f58d0f52",
      "menu_item_id": "9dc014d0-7f0b-4db3-b790-33d6f58d0f52",
      "quantity": 2
    }
  ]
}
```

### WebSocket events
```json
{"type":"new_order","order_id":"6dc014d0-7f0b-4db3-b790-33d6f58d0f52","table_id":"7dc014d0-7f0b-4db3-b790-33d6f58d0f52","status":"pending"}
{"type":"order_status_updated","order_id":"6dc014d0-7f0b-4db3-b790-33d6f58d0f52","status":"ready"}
```

### Protected admin/kitchen calls
Use a bearer token:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://127.0.0.1:8080/admin/orders
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://127.0.0.1:8080/admin/kitchen/orders
```
