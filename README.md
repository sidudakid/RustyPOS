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
export ADMIN_TOKEN=super-secret-token
cargo run
```

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
