//! Database bootstrap, migrations, and seed helpers.

use sqlx::{postgres::PgPoolOptions, PgPool};
use std::time::Duration;

pub async fn init_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
}

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    let init_sql = include_str!("../migrations/001_init.sql");
    let seed_sql = include_str!("../migrations/002_seed.sql");
    let table_tokens_sql = include_str!("../migrations/003_table_tokens.sql");
    let categories_sql = include_str!("../migrations/004_menu_categories.sql");
    let staff_roles_sql = include_str!("../migrations/005_staff_roles_and_menu_state.sql");
    let cafe_settings_sql = include_str!("../migrations/006_cafe_settings.sql");
    let inventory_fields_sql = include_str!("../migrations/007_inventory_fields.sql");
    let order_settlement_sql = include_str!("../migrations/008_order_settlement.sql");
    let menu_item_images_sql = include_str!("../migrations/009_menu_item_images.sql");
    let restaurant_setup_sql = include_str!("../migrations/010_restaurant_setup_foundation.sql");
    let managed_tables_sql = include_str!("../migrations/011_managed_tables.sql");

    sqlx::raw_sql(init_sql).execute(pool).await?;
    sqlx::raw_sql(seed_sql).execute(pool).await?;
    sqlx::raw_sql(table_tokens_sql).execute(pool).await?;
    sqlx::raw_sql(categories_sql).execute(pool).await?;
    sqlx::raw_sql(staff_roles_sql).execute(pool).await?;
    sqlx::raw_sql(cafe_settings_sql).execute(pool).await?;
    sqlx::raw_sql(inventory_fields_sql).execute(pool).await?;
    sqlx::raw_sql(order_settlement_sql).execute(pool).await?;
    sqlx::raw_sql(menu_item_images_sql).execute(pool).await?;
    sqlx::raw_sql(restaurant_setup_sql).execute(pool).await?;
    sqlx::raw_sql(managed_tables_sql).execute(pool).await?;
    Ok(())
}

pub async fn seed_if_empty(_pool: &PgPool) -> Result<(), sqlx::Error> {
    Ok(())
}
