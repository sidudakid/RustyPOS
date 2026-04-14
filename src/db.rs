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
    let stakeholder_finance_sql = include_str!("../migrations/012_stakeholder_finance.sql");
    let order_follow_up_tracking_sql = include_str!("../migrations/013_order_follow_up_tracking.sql");
    let operator_credentials_sql = include_str!("../migrations/014_operator_credentials_and_sessions.sql");
    let payment_settings_sql = include_str!("../migrations/015_payment_settings.sql");

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
    sqlx::raw_sql(stakeholder_finance_sql).execute(pool).await?;
    sqlx::raw_sql(order_follow_up_tracking_sql).execute(pool).await?;
    sqlx::raw_sql(operator_credentials_sql).execute(pool).await?;
    sqlx::raw_sql(payment_settings_sql).execute(pool).await?;
    Ok(())
}

pub async fn seed_if_empty(_pool: &PgPool) -> Result<(), sqlx::Error> {
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn every_numbered_sql_migration_is_registered_in_run_migrations() {
        let source = include_str!("db.rs");
        let migration_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");

        let mut missing = Vec::new();
        for entry in std::fs::read_dir(&migration_dir).expect("migrations dir should be readable") {
            let entry = entry.expect("migration entry should be readable");
            let path = entry.path();

            if path.extension().and_then(|ext| ext.to_str()) != Some("sql") {
                continue;
            }

            let file_name = path
                .file_name()
                .and_then(|name| name.to_str())
                .expect("migration file should have a valid utf-8 name");

            if file_name
                .chars()
                .take_while(|ch| ch.is_ascii_digit())
                .count()
                < 3
            {
                continue;
            }

            if !source.contains(file_name) {
                missing.push(file_name.to_string());
            }
        }

        missing.sort();
        assert!(
            missing.is_empty(),
            "run_migrations is missing registered SQL migrations: {}",
            missing.join(", ")
        );
    }
}
