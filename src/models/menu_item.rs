//! Menu and category models exposed to customer/admin flows.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MenuItem {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub price: i64,
    pub category: String,
    pub active: bool,
    pub available: bool,
    pub stock_count: i32,
    pub low_stock_threshold: i32,
    pub restock_needed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MenuCategory {
    pub id: Uuid,
    pub name: String,
    pub hot_pick: bool,
    pub active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub hot_pick: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCategoryRequest {
    pub name: String,
    pub hot_pick: bool,
    pub active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMenuItemRequest {
    pub name: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub price: i64,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMenuItemRequest {
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub price: i64,
    pub category: String,
    pub active: bool,
    pub available: bool,
    pub stock_count: i32,
    pub low_stock_threshold: i32,
    pub restock_needed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemAvailabilityRequest {
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryUpdateRequest {
    pub stock_count: i32,
    pub low_stock_threshold: i32,
    pub restock_needed: bool,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerMenuResponse {
    pub hot_picks: Vec<MenuItem>,
    pub menu: Vec<MenuItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdminRevenueSummary {
    pub total_revenue: i64,
    pub order_count: i64,
    pub average_order_value: i64,
}
