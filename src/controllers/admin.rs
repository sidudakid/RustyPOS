//! Admin handlers for full order visibility and manual order entry.

use crate::{
    auth::require_owner,
    errors::AppError,
    models::order::CreateOrderRequest,
    services::order_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};

pub async fn list_orders(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let orders = order_service::list_all_orders(&state.db).await?;
    Ok(HttpResponse::Ok().json(orders))
}

pub async fn create_manual_order(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let created = order_service::create_order(&state, payload.into_inner()).await?;
    Ok(HttpResponse::Created().json(created))
}

pub async fn revenue_summary(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let summary = order_service::admin_revenue_summary(&state.db).await?;
    Ok(HttpResponse::Ok().json(summary))
}
