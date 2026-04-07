//! Route registration for customer, kitchen, admin, and websocket APIs.

use crate::{controllers, ws};
use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
            .route("/health", web::get().to(controllers::health::health))
            .route("/cafe-settings", web::get().to(controllers::cafe_settings::get_cafe_settings))
            .route("/admin/cafe-settings", web::patch().to(controllers::cafe_settings::update_cafe_settings))
            .route("/admin/tables", web::get().to(controllers::cafe_settings::list_admin_tables))
            .route("/admin/tables/operations", web::get().to(controllers::cafe_settings::list_admin_table_operations))
            .route("/table-tokens/{token}", web::get().to(controllers::table_tokens::resolve_table_token))
            .route("/table-tokens/{token}/menu", web::get().to(controllers::customer::get_token_menu))
            .route("/tables/{id}/menu", web::get().to(controllers::customer::get_table_menu))
            .route("/orders", web::post().to(controllers::customer::place_order))
            .route("/orders/by-token", web::post().to(controllers::customer::place_token_order))
            .route("/orders/{id}", web::get().to(controllers::customer::get_order_status))
            .route("/orders", web::get().to(controllers::admin::list_orders))
            .route("/admin/revenue", web::get().to(controllers::admin::revenue_summary))
            .route("/admin/analytics", web::get().to(controllers::analytics::analytics_summary))
            .route("/admin/expenses", web::get().to(controllers::analytics::list_monthly_expenses))
            .route("/admin/expenses", web::put().to(controllers::analytics::upsert_monthly_expense))
            .route("/orders/manual", web::post().to(controllers::admin::create_manual_order))
            .route("/orders/{id}/status", web::patch().to(controllers::kitchen::update_order_status))
            .route("/kitchen/orders", web::get().to(controllers::kitchen::list_active_orders))
            .route("/admin/categories", web::get().to(controllers::admin_menu::list_categories))
            .route("/admin/categories", web::post().to(controllers::admin_menu::create_category))
            .route("/admin/categories/{id}", web::patch().to(controllers::admin_menu::update_category))
            .route("/admin/categories/{id}/archive", web::post().to(controllers::admin_menu::archive_category))
            .route("/admin/menu-items", web::get().to(controllers::admin_menu::list_menu_items))
            .route("/admin/menu-items", web::post().to(controllers::admin_menu::create_menu_item))
            .route("/admin/menu-items/{id}", web::patch().to(controllers::admin_menu::update_menu_item))
            .route("/admin/menu-items/{id}/archive", web::post().to(controllers::admin_menu::archive_menu_item))
            .route("/admin/menu-items/{id}/availability", web::patch().to(controllers::admin_menu::set_menu_item_availability))
            .route("/admin/inventory", web::get().to(controllers::inventory::owner_inventory_summary))
            .route("/inventory", web::get().to(controllers::inventory::list_inventory))
            .route("/inventory/{id}", web::patch().to(controllers::inventory::update_inventory_item))
            .route("/staff/open-tables", web::get().to(controllers::staff::list_open_tables))
            .route("/staff/tables", web::get().to(controllers::staff::list_table_operations))
            .route("/staff/tables/{id}/settle", web::post().to(controllers::staff::settle_table))
            .route("/ws/orders", web::get().to(ws::orders_ws)),
    );
}
