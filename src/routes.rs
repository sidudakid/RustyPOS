//! Route registration for customer, kitchen, admin, and websocket APIs.

use crate::{controllers, ws};
use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("")
            .route("/health", web::get().to(controllers::health::health))
            .route("/cafe-settings", web::get().to(controllers::cafe_settings::get_cafe_settings))
            .route("/admin/cafe-settings", web::patch().to(controllers::cafe_settings::update_cafe_settings))
            .route("/table-tokens/{token}", web::get().to(controllers::table_tokens::resolve_table_token))
            .route("/table-tokens/{token}/menu", web::get().to(controllers::customer::get_token_menu))
            .route("/tables/{id}/menu", web::get().to(controllers::customer::get_table_menu))
            .route("/orders", web::post().to(controllers::customer::place_order))
            .route("/orders/by-token", web::post().to(controllers::customer::place_token_order))
            .route("/orders/{id}", web::get().to(controllers::customer::get_order_status))
            .route("/orders", web::get().to(controllers::admin::list_orders))
            .route("/admin/revenue", web::get().to(controllers::admin::revenue_summary))
            .route("/admin/analytics", web::get().to(controllers::analytics::analytics_summary))
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
            .route("/ws/orders", web::get().to(ws::orders_ws)),
    );
}
