//! Order service layer: validation, persistence, and event emission.

use crate::{
    errors::AppError,
    models::{
        menu_item::{AdminRevenueSummary, CustomerMenuResponse, MenuItem, MenuRecommendation},
        order::{
            CreateOrderRequest, OpenTableSummary, Order, OrderItem, OrderItemView, OrderRow, OrderStatus,
            OrderWithItems, OrderWithItemsView, TableOperationalSummary,
        },
        table::CafeTable,
    },
    services::order_events::OrderEventMessage,
    AppState,
};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

pub async fn get_table_by_token(pool: &PgPool, token: &str) -> Result<CafeTable, AppError> {
    let table = sqlx::query_as::<_, CafeTable>(
        "SELECT t.id, t.name
         FROM table_tokens tt
         JOIN tables t ON t.id = tt.table_id
         WHERE tt.token = $1 AND t.active = true",
    )
    .bind(token)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(table)
}

pub async fn resolve_table_id_by_token(pool: &PgPool, token: &str) -> Result<Uuid, AppError> {
    let table = get_table_by_token(pool, token).await?;
    Ok(table.id)
}

pub async fn get_menu_for_table(pool: &PgPool, table_id: Uuid) -> Result<CustomerMenuResponse, AppError> {
    let table_exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM tables WHERE id = $1 AND active = true")
        .bind(table_id)
        .fetch_optional(pool)
        .await?;

    if table_exists.is_none() {
        return Err(AppError::NotFound);
    }

    let menu = sqlx::query_as::<_, MenuItem>(
        "SELECT id, name, description, image_url, price, category, active, available, stock_count, low_stock_threshold, restock_needed
         FROM menu_items
         WHERE active = true AND available = true AND stock_count > 0
         ORDER BY category, name",
    )
    .fetch_all(pool)
    .await?;

    let hot_picks = sqlx::query_as::<_, MenuItem>(
        "SELECT mi.id, mi.name, mi.description, mi.image_url, mi.price, mi.category, mi.active, mi.available, mi.stock_count, mi.low_stock_threshold, mi.restock_needed
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE o.created_at >= NOW() - INTERVAL '24 hours' AND mi.active = true AND mi.available = true AND mi.stock_count > 0
         GROUP BY mi.id, mi.name, mi.description, mi.image_url, mi.price, mi.category, mi.active, mi.available, mi.stock_count, mi.low_stock_threshold, mi.restock_needed
         ORDER BY SUM(oi.quantity) DESC, MAX(o.created_at) DESC
         LIMIT 4",
    )
    .fetch_all(pool)
    .await?;

    let hot_picks = if hot_picks.is_empty() {
        sqlx::query_as::<_, MenuItem>(
            "SELECT mi.id, mi.name, mi.description, mi.image_url, mi.price, mi.category, mi.active, mi.available, mi.stock_count, mi.low_stock_threshold, mi.restock_needed
             FROM menu_items mi
             JOIN menu_categories mc ON mc.name = mi.category
             WHERE mc.hot_pick = true AND mc.active = true AND mi.active = true AND mi.available = true AND mi.stock_count > 0
             ORDER BY mi.name
             LIMIT 4",
        )
        .fetch_all(pool)
        .await
        .unwrap_or_default()
    } else {
        hot_picks
    };

    let recommendations = sqlx::query_as::<_, (uuid::Uuid, String, String, String, i64, String, bool, bool, i32, i32, bool, i64, i64)>(
        "WITH recent_pairs AS (
            SELECT
                oi1.menu_item_id AS anchor_item_id,
                oi2.menu_item_id AS recommended_item_id,
                COUNT(DISTINCT oi1.order_id)::BIGINT AS paired_order_count,
                SUM(LEAST(oi1.quantity, oi2.quantity))::BIGINT AS pair_strength
            FROM order_items oi1
            JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.menu_item_id <> oi2.menu_item_id
            JOIN orders o ON o.id = oi1.order_id
            WHERE o.created_at >= NOW() - INTERVAL '90 days'
            GROUP BY oi1.menu_item_id, oi2.menu_item_id
        ), ranked AS (
            SELECT
                recommended_item_id,
                SUM(pair_strength)::BIGINT AS score,
                SUM(paired_order_count)::BIGINT AS paired_order_count
            FROM recent_pairs
            GROUP BY recommended_item_id
            ORDER BY SUM(pair_strength) DESC, SUM(paired_order_count) DESC
            LIMIT 8
        )
        SELECT
            mi.id,
            mi.name,
            mi.description,
            mi.image_url,
            mi.price,
            mi.category,
            mi.active,
            mi.available,
            mi.stock_count,
            mi.low_stock_threshold,
            mi.restock_needed,
            ranked.score,
            ranked.paired_order_count
        FROM ranked
        JOIN menu_items mi ON mi.id = ranked.recommended_item_id
        WHERE mi.active = true AND mi.available = true AND mi.stock_count > 0
        ORDER BY ranked.score DESC, ranked.paired_order_count DESC, mi.name ASC",
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(id, name, description, image_url, price, category, active, available, stock_count, low_stock_threshold, restock_needed, score, paired_order_count)| MenuRecommendation {
        item: MenuItem {
            id,
            name,
            description,
            image_url,
            price,
            category,
            active,
            available,
            stock_count,
            low_stock_threshold,
            restock_needed,
        },
        score,
        paired_order_count,
    })
    .collect();

    Ok(CustomerMenuResponse { hot_picks, menu, recommendations })
}

pub async fn create_order(state: &AppState, payload: CreateOrderRequest) -> Result<OrderWithItemsView, AppError> {
    validate_items(&payload)?;

    let mut tx = state.db.begin().await?;
    ensure_table_exists(&mut tx, payload.table_id).await?;

    let order: Order = sqlx::query_as::<_, OrderRow>(
        "INSERT INTO orders (id, table_id, status, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, table_id, status, created_at, paid_at",
    )
    .bind(Uuid::new_v4())
    .bind(payload.table_id)
    .bind(OrderStatus::Pending)
    .fetch_one(&mut *tx)
    .await?
    .into();

    for item in &payload.items {
        ensure_menu_item_exists(&mut tx, item.menu_item_id).await?;

        sqlx::query_as::<_, OrderItem>(
            "INSERT INTO order_items (id, order_id, menu_item_id, quantity)
             VALUES ($1, $2, $3, $4)
             RETURNING id, order_id, menu_item_id, quantity",
        )
        .bind(Uuid::new_v4())
        .bind(order.id)
        .bind(item.menu_item_id)
        .bind(item.quantity)
        .fetch_one(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    state.order_events.send(OrderEventMessage::NewOrder {
        order_id: order.id,
        table_id: order.table_id,
        status: order.status,
    });

    get_order_view(&state.db, order.id).await
}

pub async fn get_order(pool: &PgPool, order_id: Uuid) -> Result<OrderWithItemsView, AppError> {
    get_order_view(pool, order_id).await
}

pub async fn list_active_orders(pool: &PgPool) -> Result<Vec<OrderWithItemsView>, AppError> {
    list_orders_by_clause(pool, "WHERE status IN ('pending', 'preparing', 'ready')").await
}

pub async fn list_all_orders(pool: &PgPool) -> Result<Vec<OrderWithItemsView>, AppError> {
    list_orders_by_clause(pool, "").await
}

pub async fn admin_revenue_summary(pool: &PgPool) -> Result<AdminRevenueSummary, AppError> {
    let row: (i64, i64,) = sqlx::query_as(
        "SELECT
            COALESCE(SUM((mi.price * oi.quantity)::BIGINT), 0)::BIGINT AS total_revenue,
            COUNT(DISTINCT o.id)::BIGINT AS order_count
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN menu_items mi ON mi.id = oi.menu_item_id",
    )
    .fetch_one(pool)
    .await?;

    let total_revenue = row.0;
    let order_count = row.1;
    let average_order_value = if order_count > 0 {
        total_revenue / order_count
    } else {
        0
    };

    Ok(AdminRevenueSummary {
        total_revenue,
        order_count,
        average_order_value,
    })
}

pub async fn list_open_tables(pool: &PgPool) -> Result<Vec<OpenTableSummary>, AppError> {
    let rows = sqlx::query_as::<_, (Uuid, String, i64, i64)>(
        "SELECT
            t.id,
            t.name,
            COUNT(DISTINCT o.id)::BIGINT AS order_count,
            COALESCE(SUM((mi.price * oi.quantity)::BIGINT), 0)::BIGINT AS total_amount
         FROM tables t
         JOIN orders o ON o.table_id = t.id
         JOIN order_items oi ON oi.order_id = o.id
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE o.status != 'paid'
         GROUP BY t.id, t.name
         ORDER BY t.name",
    )
    .fetch_all(pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());

    for (table_id, table_name, order_count, total_amount) in rows {
        let statuses = sqlx::query_scalar::<_, OrderStatus>(
            "SELECT DISTINCT status
             FROM orders
             WHERE table_id = $1 AND status != 'paid'
             ORDER BY status",
        )
        .bind(table_id)
        .fetch_all(pool)
        .await?;

        out.push(OpenTableSummary {
            table_id,
            table_name,
            order_count,
            total_amount,
            statuses,
        });
    }

    Ok(out)
}

pub async fn settle_table(pool: &PgPool, table_id: Uuid) -> Result<Vec<OrderWithItemsView>, AppError> {
    let order_ids = sqlx::query_scalar::<_, Uuid>(
        "UPDATE orders
         SET status = 'paid', paid_at = NOW()
         WHERE table_id = $1 AND status != 'paid'
         RETURNING id",
    )
    .bind(table_id)
    .fetch_all(pool)
    .await?;

    if order_ids.is_empty() {
        return Err(AppError::BadRequest("no open orders found for table".into()));
    }

    let mut settled = Vec::with_capacity(order_ids.len());
    for order_id in order_ids {
        settled.push(get_order_view(pool, order_id).await?);
    }

    Ok(settled)
}

pub async fn list_table_operational_summary(pool: &PgPool) -> Result<Vec<TableOperationalSummary>, AppError> {
    let rows = sqlx::query_as::<_, (Uuid, String, Option<i32>, bool, i64, i64, i64, i64, Option<chrono::DateTime<chrono::Utc>>)>(
        "SELECT
            t.id,
            t.name,
            t.table_number,
            t.active,
            COUNT(DISTINCT CASE WHEN o.status != 'paid' THEN o.id END)::BIGINT AS open_order_count,
            COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.id END)::BIGINT AS paid_order_count,
            COUNT(DISTINCT CASE WHEN o.status = 'ready' THEN o.id END)::BIGINT AS ready_order_count,
            COALESCE(SUM(CASE WHEN o.status != 'paid' THEN (mi.price * oi.quantity)::BIGINT ELSE 0 END), 0)::BIGINT AS unpaid_total_amount,
            MAX(o.created_at) AS last_order_at
         FROM tables t
         LEFT JOIN orders o ON o.table_id = t.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
         GROUP BY t.id, t.name, t.table_number, t.active
         ORDER BY t.active DESC, t.table_number NULLS LAST, t.name"
    )
    .fetch_all(pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for (table_id, table_name, table_number, active, open_order_count, paid_order_count, ready_order_count, unpaid_total_amount, last_order_at) in rows {
        let unpaid_statuses = sqlx::query_scalar::<_, OrderStatus>(
            "SELECT DISTINCT status
             FROM orders
             WHERE table_id = $1 AND status != 'paid'
             ORDER BY status"
        )
        .bind(table_id)
        .fetch_all(pool)
        .await?;

        out.push(TableOperationalSummary {
            table_id,
            table_name,
            table_number,
            active,
            open_order_count,
            paid_order_count,
            ready_order_count,
            unpaid_total_amount,
            unpaid_statuses,
            last_order_at,
        });
    }

    Ok(out)
}

pub async fn update_order_status(
    state: &AppState,
    order_id: Uuid,
    status: OrderStatus,
) -> Result<OrderWithItemsView, AppError> {
    let updated: Option<(Uuid,)> = sqlx::query_as(
        "UPDATE orders SET status = $2 WHERE id = $1 RETURNING id",
    )
    .bind(order_id)
    .bind(status)
    .fetch_optional(&state.db)
    .await?;

    if updated.is_none() {
        return Err(AppError::NotFound);
    }

    state
        .order_events
        .send(OrderEventMessage::OrderStatusUpdated { order_id, status });

    get_order_view(&state.db, order_id).await
}

async fn get_order_view(pool: &PgPool, order_id: Uuid) -> Result<OrderWithItemsView, AppError> {
    let order: Order = sqlx::query_as::<_, OrderRow>(
        "SELECT id, table_id, status, created_at, paid_at FROM orders WHERE id = $1",
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await?
    .map(Into::into)
    .ok_or(AppError::NotFound)?;

    let table_name = get_table_name(pool, order.table_id).await?;
    let items = get_order_items_view(pool, order_id).await?;

    Ok(OrderWithItems {
        order,
        items: vec![],
    }
    .into_view(table_name, items))
}

async fn list_orders_by_clause(pool: &PgPool, clause: &str) -> Result<Vec<OrderWithItemsView>, AppError> {
    let query = format!(
        "SELECT id, table_id, status, created_at, paid_at FROM orders {} ORDER BY created_at DESC",
        clause
    );

    let orders: Vec<Order> = sqlx::query_as::<_, OrderRow>(&query)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(Into::into)
        .collect();

    let mut out = Vec::with_capacity(orders.len());

    for order in orders {
        let table_name = get_table_name(pool, order.table_id).await?;
        let items = get_order_items_view(pool, order.id).await?;
        out.push(
            OrderWithItems {
                order,
                items: vec![],
            }
            .into_view(table_name, items),
        );
    }

    Ok(out)
}

async fn get_table_name(pool: &PgPool, table_id: Uuid) -> Result<Option<String>, AppError> {
    let table: Option<(String,)> = sqlx::query_as("SELECT name FROM tables WHERE id = $1")
        .bind(table_id)
        .fetch_optional(pool)
        .await?;
    Ok(table.map(|row| row.0))
}

async fn get_order_items_view(pool: &PgPool, order_id: Uuid) -> Result<Vec<OrderItemView>, AppError> {
    let items = sqlx::query_as::<_, OrderItemView>(
        "SELECT
            oi.id,
            oi.order_id,
            oi.menu_item_id,
            oi.quantity,
            mi.name AS menu_item_name,
            mi.category AS menu_item_category,
            mi.price AS menu_item_price
         FROM order_items oi
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE oi.order_id = $1
         ORDER BY oi.id",
    )
    .bind(order_id)
    .fetch_all(pool)
    .await?;

    Ok(items)
}

fn validate_items(payload: &CreateOrderRequest) -> Result<(), AppError> {
    if payload.items.is_empty() {
        return Err(AppError::BadRequest("order must include at least one item".into()));
    }

    if payload.items.iter().any(|item| item.quantity <= 0) {
        return Err(AppError::BadRequest("item quantity must be greater than zero".into()));
    }

    Ok(())
}

async fn ensure_table_exists<'a>(
    tx: &mut Transaction<'a, Postgres>,
    table_id: Uuid,
) -> Result<(), AppError> {
    let exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM tables WHERE id = $1 AND active = true")
        .bind(table_id)
        .fetch_optional(&mut **tx)
        .await?;

    if exists.is_some() {
        Ok(())
    } else {
        Err(AppError::BadRequest("table not found".into()))
    }
}

async fn ensure_menu_item_exists<'a>(
    tx: &mut Transaction<'a, Postgres>,
    menu_item_id: Uuid,
) -> Result<(), AppError> {
    let exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM menu_items WHERE id = $1")
        .bind(menu_item_id)
        .fetch_optional(&mut **tx)
        .await?;

    if exists.is_some() {
        Ok(())
    } else {
        Err(AppError::BadRequest("menu item not found".into()))
    }
}
