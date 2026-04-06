//! Kitchen handlers for active queues and order state transitions.

use crate::{
    auth::require_kitchen_access,
    errors::AppError,
    models::order::UpdateOrderStatusRequest,
    services::order_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

pub async fn list_active_orders(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_kitchen_access(&req, &state).await?;
    let orders = order_service::list_active_orders(&state.db).await?;
    Ok(HttpResponse::Ok().json(orders))
}

pub async fn update_order_status(
    req: HttpRequest,
    state: web::Data<AppState>,
    order_id: web::Path<Uuid>,
    payload: web::Json<UpdateOrderStatusRequest>,
) -> Result<HttpResponse, AppError> {
    require_kitchen_access(&req, &state).await?;
    let updated = order_service::update_order_status(&state, order_id.into_inner(), payload.status).await?;
    Ok(HttpResponse::Ok().json(updated))
}
