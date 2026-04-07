//! Order-related domain models and request/response payloads.

use chrono::{DateTime, Utc};
use postgres_types::{FromSql, ToSql};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSql, FromSql)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "order_status", rename_all = "snake_case")]
#[postgres(name = "order_status")]
pub enum OrderStatus {
    Pending,
    Preparing,
    Ready,
    Paid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: Uuid,
    pub table_id: Uuid,
    pub status: OrderStatus,
    pub created_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow)]
pub struct OrderRow {
    pub id: Uuid,
    pub table_id: Uuid,
    pub status: OrderStatus,
    pub created_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
}

impl From<OrderRow> for Order {
    fn from(value: OrderRow) -> Self {
        Self {
            id: value.id,
            table_id: value.table_id,
            status: value.status,
            created_at: value.created_at,
            paid_at: value.paid_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub menu_item_id: Uuid,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItemView {
    pub id: Uuid,
    pub order_id: Uuid,
    pub menu_item_id: Uuid,
    pub quantity: i32,
    pub menu_item_name: String,
    pub menu_item_category: String,
    pub menu_item_price: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderView {
    pub id: Uuid,
    pub table_id: Uuid,
    pub table_name: Option<String>,
    pub status: OrderStatus,
    pub created_at: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderWithItemsView {
    pub order: OrderView,
    pub items: Vec<OrderItemView>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenTableSummary {
    pub table_id: Uuid,
    pub table_name: String,
    pub order_count: i64,
    pub total_amount: i64,
    pub statuses: Vec<OrderStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableOperationalSummary {
    pub table_id: Uuid,
    pub table_name: String,
    pub table_number: Option<i32>,
    pub active: bool,
    pub open_order_count: i64,
    pub paid_order_count: i64,
    pub ready_order_count: i64,
    pub unpaid_total_amount: i64,
    pub unpaid_statuses: Vec<OrderStatus>,
    pub last_order_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderItemRequest {
    pub menu_item_id: Uuid,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub table_id: Uuid,
    pub items: Vec<CreateOrderItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTokenOrderRequest {
    pub token: String,
    pub items: Vec<CreateOrderItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderStatusRequest {
    pub status: OrderStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderWithItems {
    pub order: Order,
    pub items: Vec<OrderItem>,
}

impl OrderWithItems {
    pub fn into_view(self, table_name: Option<String>, items: Vec<OrderItemView>) -> OrderWithItemsView {
        OrderWithItemsView {
            order: OrderView {
                id: self.order.id,
                table_id: self.order.table_id,
                table_name,
                status: self.order.status,
                created_at: self.order.created_at,
                paid_at: self.order.paid_at,
            },
            items,
        }
    }
}
