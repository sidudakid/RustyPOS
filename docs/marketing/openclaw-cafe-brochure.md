# OpenClaw Café

## Digital café service that keeps table ordering, kitchen prep, front-of-house, and owner controls in one streamlined flow

OpenClaw Café is a restaurant ordering and operations platform built for cafés and small hospitality teams that need table-based digital ordering without adding friction for staff. Guests scan a table QR code, browse a live menu, place an order from their phone, and follow order progress in real time. Meanwhile, kitchen, staff, and admin each get a dedicated workspace built for their role.

### Best fit
- Cafés and small restaurants with table service, counter service, or hybrid service
- Teams that want QR ordering tied to real table records
- Operators who need live order visibility plus a cleaner back-office setup for menu, stock, and settings

## Why it matters
- Reduces ordering friction for guests at the table
- Sends orders directly into a live kitchen workflow
- Gives staff a clear settlement and pickup view
- Keeps admin setup, menu data, inventory data, analytics, and branding in one system
- Supports table-specific access links and downloadable QR codes for deployment on the floor

## Key product capabilities

### Customer ordering
- Table-specific ordering links and tokens
- Customer menu grouped by category
- Hot picks section for featured items
- Item images, descriptions, category labels, and live pricing
- In-page cart with quantity controls, remove, clear cart, and total calculation
- Order placement tied to the active table token
- Customer order tracker page with live status updates
- Optional browser/sound notifications when an order becomes ready

### Kitchen workflow
- Dedicated kitchen board for pending, preparing, and ready orders
- Real-time websocket updates for new orders
- Sound and browser notifications for incoming orders
- One-click status progression from pending to preparing to ready
- Clear ticket view showing item quantities, table reference, time, and order value

### Staff and front-of-house workflow
- Staff station separate from the kitchen board
- Live floor snapshot with active tables, idle tables, open checks, and attention indicators
- Ready-order pickup queue
- Settlement queue for unpaid tables
- One-click table settlement / mark paid flow
- Live websocket alerts when orders become ready
- Fast inventory actions such as add stock, mark out, and clear alert

### Admin and owner workflow
- Management overview for setup readiness, menu footprint, table provisioning, stock watchlists, and revenue snapshot
- Menu category CRUD with hot-pick tagging and archive controls
- Menu item CRUD with name, description, image URL, price, category, active state, and availability state
- Inventory workspace with stock counts, low-stock thresholds, restock flags, availability, filtering, searching, sorting, and archive support
- Café settings for brand, legal identity, slug, tagline, image URL, currency, timezone, colors, support contacts, address, service mode, table naming, and table counts
- Auto-generated table name preview
- Live table token management with direct links, copy actions, QR preview modal, and downloadable SVG QR codes

### Reporting and analytics
- Revenue summary with total revenue, average order value, and paid order count
- Monthly revenue trend view
- Peak-hour reporting with order count and revenue by hour
- Monthly profit and loss view with revenue, costs, profit, and margin percentage

## Customer flow
1. Guest scans the QR code or opens the table link.
2. OpenClaw Café resolves the table token and loads the correct menu.
3. Guest browses categories, reviews hot picks, and adds items to the cart.
4. Guest places the order from their phone.
5. The customer can open an order tracker and watch status updates live.
6. When the order is ready, the customer can receive an on-device notification.

## Staff, kitchen, and admin flow

### Kitchen
- New order appears on the kitchen board in pending
- Staff in kitchen starts preparation
- Order moves to preparing
- Order is marked ready for handoff or pickup

### Staff
- Staff station shows open tables and unpaid totals
- Front-of-house sees ready orders for pickup
- Team settles the table when service is complete
- Staff can react quickly to low-stock or out-of-stock items during service

### Admin
- Owner configures branding, table count, address, and support details
- Admin provisions live table links and QR codes
- Admin maintains categories, menu records, and stock data
- Admin reviews revenue and trend data from the analytics workspace

## What makes it stand out
- One product with distinct role-based workspaces instead of a single overloaded dashboard
- Table-aware QR ordering linked to real operational tables
- Real-time order updates across customer, kitchen, and staff views
- QR generation and downloadable table assets built into settings
- Practical inventory signals tied directly to menu availability
- Café branding and setup controls included, not bolted on separately

## Deployment and operating model
- Backend API and websocket service built in Rust
- Frontend routes for customer, kitchen, staff, and admin workspaces
- Bearer-token protection for staff, kitchen, and admin operational surfaces
- Frontend can point at a configurable API base and supports LAN/mobile testing

## Ideal stakeholder message
OpenClaw Café helps cafés serve faster with fewer order bottlenecks. Customers order from the table, kitchen gets live prep visibility, front-of-house manages settlement and pickup, and owners keep control of menus, stock, branding, tables, and reporting in one operational system.

## Limitations to note honestly
- Payment gateway or integrated card processing is not shown in the current codebase
- Reservation management, loyalty, delivery, and multi-location management are not shown in the current codebase
- The brochure reflects features visible in the current backend routes and frontend pages only
