//! Inventory handlers for owner/staff stock management.

use crate::{
    auth::{require_inventory_access, require_owner},
    errors::AppError,
    models::menu_item::InventoryUpdateRequest,
    services::menu_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

pub async fn list_inventory(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_inventory_access(&req, &state).await?;
    let items = menu_service::list_menu_items(&state.db).await?;
    Ok(HttpResponse::Ok().json(items))
}

pub async fn update_inventory_item(
    req: HttpRequest,
    state: web::Data<AppState>,
    item_id: web::Path<Uuid>,
    payload: web::Json<InventoryUpdateRequest>,
) -> Result<HttpResponse, AppError> {
    require_inventory_access(&req, &state).await?;
    let item = menu_service::update_inventory_item(&state.db, item_id.into_inner(), payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(item))
}

pub async fn owner_inventory_summary(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let items = menu_service::list_menu_items(&state.db).await?;
    Ok(HttpResponse::Ok().json(items))
}
