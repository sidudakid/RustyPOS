//! Menu/category service for admin panel management.

use crate::{
    errors::AppError,
    models::menu_item::{
        CreateCategoryRequest, CreateMenuItemRequest, ItemAvailabilityRequest, MenuCategory, MenuItem,
        UpdateCategoryRequest, UpdateMenuItemRequest,
    },
};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn list_categories(pool: &PgPool) -> Result<Vec<MenuCategory>, AppError> {
    let categories = sqlx::query_as::<_, MenuCategory>(
        "SELECT id, name, hot_pick, active, sort_order FROM menu_categories ORDER BY sort_order, name",
    )
    .fetch_all(pool)
    .await?;

    Ok(categories)
}

pub async fn list_menu_items(pool: &PgPool) -> Result<Vec<MenuItem>, AppError> {
    let items = sqlx::query_as::<_, MenuItem>(
        "SELECT id, name, description, price, category, active, available FROM menu_items ORDER BY category, name",
    )
    .fetch_all(pool)
    .await?;

    Ok(items)
}

pub async fn create_category(pool: &PgPool, payload: CreateCategoryRequest) -> Result<MenuCategory, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("category name cannot be empty".into()));
    }

    let category = sqlx::query_as::<_, MenuCategory>(
        "INSERT INTO menu_categories (id, name, hot_pick, active, sort_order)
         VALUES ($1, $2, $3, true, COALESCE((SELECT MAX(sort_order) + 10 FROM menu_categories), 10))
         RETURNING id, name, hot_pick, active, sort_order",
    )
    .bind(Uuid::new_v4())
    .bind(payload.name)
    .bind(payload.hot_pick)
    .fetch_one(pool)
    .await?;

    Ok(category)
}

pub async fn update_category(pool: &PgPool, category_id: Uuid, payload: UpdateCategoryRequest) -> Result<MenuCategory, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("category name cannot be empty".into()));
    }

    let category = sqlx::query_as::<_, MenuCategory>(
        "UPDATE menu_categories
         SET name = $2, hot_pick = $3, active = $4, sort_order = $5
         WHERE id = $1
         RETURNING id, name, hot_pick, active, sort_order",
    )
    .bind(category_id)
    .bind(payload.name)
    .bind(payload.hot_pick)
    .bind(payload.active)
    .bind(payload.sort_order)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(category)
}

pub async fn archive_category(pool: &PgPool, category_id: Uuid) -> Result<MenuCategory, AppError> {
    let category = sqlx::query_as::<_, MenuCategory>(
        "UPDATE menu_categories
         SET active = false
         WHERE id = $1
         RETURNING id, name, hot_pick, active, sort_order",
    )
    .bind(category_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(category)
}

pub async fn create_menu_item(pool: &PgPool, payload: CreateMenuItemRequest) -> Result<MenuItem, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("item name cannot be empty".into()));
    }

    if payload.price <= 0 {
        return Err(AppError::BadRequest("price must be greater than zero".into()));
    }

    let item = sqlx::query_as::<_, MenuItem>(
        "INSERT INTO menu_items (id, name, description, price, category, active, available)
         VALUES ($1, $2, $3, $4, $5, true, true)
         RETURNING id, name, description, price, category, active, available",
    )
    .bind(Uuid::new_v4())
    .bind(payload.name)
    .bind(payload.description.unwrap_or_default())
    .bind(payload.price)
    .bind(payload.category)
    .fetch_one(pool)
    .await?;

    Ok(item)
}

pub async fn update_menu_item(pool: &PgPool, item_id: Uuid, payload: UpdateMenuItemRequest) -> Result<MenuItem, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("item name cannot be empty".into()));
    }

    if payload.price <= 0 {
        return Err(AppError::BadRequest("price must be greater than zero".into()));
    }

    let item = sqlx::query_as::<_, MenuItem>(
        "UPDATE menu_items
         SET name = $2, description = $3, price = $4, category = $5, active = $6, available = $7
         WHERE id = $1
         RETURNING id, name, description, price, category, active, available",
    )
    .bind(item_id)
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.price)
    .bind(payload.category)
    .bind(payload.active)
    .bind(payload.available)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(item)
}

pub async fn archive_menu_item(pool: &PgPool, item_id: Uuid) -> Result<MenuItem, AppError> {
    let item = sqlx::query_as::<_, MenuItem>(
        "UPDATE menu_items
         SET active = false, available = false
         WHERE id = $1
         RETURNING id, name, description, price, category, active, available",
    )
    .bind(item_id)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(item)
}

pub async fn set_item_availability(pool: &PgPool, item_id: Uuid, payload: ItemAvailabilityRequest) -> Result<MenuItem, AppError> {
    let item = sqlx::query_as::<_, MenuItem>(
        "UPDATE menu_items
         SET available = $2
         WHERE id = $1
         RETURNING id, name, description, price, category, active, available",
    )
    .bind(item_id)
    .bind(payload.available)
    .fetch_optional(pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(item)
}
