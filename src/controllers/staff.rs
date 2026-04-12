//! Staff/cashier handlers for table settlement and inventory-facing workflows.

use crate::{
    auth::require_staff_access,
    errors::AppError,
    services::order_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

pub async fn list_orders(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_staff_access(&req, &state).await?;
    let orders = order_service::list_all_orders(&state.db).await?;
    Ok(HttpResponse::Ok().json(orders))
}

pub async fn list_open_tables(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_staff_access(&req, &state).await?;
    let tables = order_service::list_open_tables(&state.db).await?;
    Ok(HttpResponse::Ok().json(tables))
}

pub async fn settle_table(
    req: HttpRequest,
    state: web::Data<AppState>,
    table_id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    require_staff_access(&req, &state).await?;
    let settled = order_service::settle_table(&state.db, table_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(settled))
}

pub async fn list_table_operations(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_staff_access(&req, &state).await?;
    let tables = order_service::list_table_operational_summary(&state.db).await?;
    Ok(HttpResponse::Ok().json(tables))
}
