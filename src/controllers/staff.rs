//! Staff/cashier handlers for table settlement and inventory-facing workflows.

use crate::{
    auth::require_kitchen_access,
    errors::AppError,
    services::order_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

pub async fn list_open_tables(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_kitchen_access(&req, &state).await?;
    let tables = order_service::list_open_tables(&state.db).await?;
    Ok(HttpResponse::Ok().json(tables))
}

pub async fn settle_table(
    req: HttpRequest,
    state: web::Data<AppState>,
    table_id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    require_kitchen_access(&req, &state).await?;
    let settled = order_service::settle_table(&state.db, table_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(settled))
}
