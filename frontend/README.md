# OpenClaw Café Frontend

## Setup

```bash
npm install
npm run dev
```

## API base behavior
- If `VITE_API_BASE` is set, frontend uses it.
- If not set, frontend defaults to:
  - `http://<current-browser-host>:8081`

That means:
- on desktop at `localhost:5173`, it will use `http://localhost:8081`
- on phone at `192.168.1.81:5173`, it will use `http://192.168.1.81:8081`

## LAN/mobile testing
Run backend:

```bash
HOST=0.0.0.0 PORT=8081 cargo run
```

Run frontend:

```bash
npm run dev -- --host 0.0.0.0
```

Then open from another device using your computer's LAN IP, for example:
- `http://192.168.1.81:5173`

## Routes
- `/t/:token`
- `/t/:token/order/:orderId`
- `/kitchen`
- `/admin/orders`
