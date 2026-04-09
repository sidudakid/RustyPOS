//! Customer-facing handlers for menu browsing, ordering, and status checks.

use crate::{
    errors::AppError,
    models::order::{AddOrderItemsRequest, CreateOrderRequest, CreateTokenOrderRequest, OrderWithItemsView},
    services::order_service,
    AppState,
};
use actix_web::{web, HttpResponse};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CustomerMenuQuery {
    #[serde(default)]
    pub selected: Vec<Uuid>,
}

pub async fn get_table_menu(
    state: web::Data<AppState>,
    table_id: web::Path<Uuid>,
    query: web::Query<CustomerMenuQuery>,
) -> Result<HttpResponse, AppError> {
    let menu = order_service::get_menu_for_table(&state.db, table_id.into_inner(), &query.selected).await?;
    Ok(HttpResponse::Ok().json(menu))
}

pub async fn get_token_menu(
    state: web::Data<AppState>,
    token: web::Path<String>,
    query: web::Query<CustomerMenuQuery>,
) -> Result<HttpResponse, AppError> {
    let table_id = order_service::resolve_table_id_by_token(&state.db, &token.into_inner()).await?;
    let menu = order_service::get_menu_for_table(&state.db, table_id, &query.selected).await?;
    Ok(HttpResponse::Ok().json(menu))
}


pub async fn get_current_token_order(
    state: web::Data<AppState>,
    token: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let current = order_service::get_current_order_for_token(&state.db, &token.into_inner()).await?;
    Ok(HttpResponse::Ok().json(current))
}

pub async fn place_order(
    state: web::Data<AppState>,
    payload: web::Json<CreateOrderRequest>,
) -> Result<HttpResponse, AppError> {
    let created = order_service::create_order(&state, payload.into_inner()).await?;
    Ok(HttpResponse::Created().json(created))
}

pub async fn place_token_order(
    state: web::Data<AppState>,
    payload: web::Json<CreateTokenOrderRequest>,
) -> Result<HttpResponse, AppError> {
    let payload = payload.into_inner();
    let table_id = order_service::resolve_table_id_by_token(&state.db, &payload.token).await?;
    let created = order_service::create_order(
        &state,
        CreateOrderRequest {
            table_id,
            items: payload.items,
        },
    )
    .await?;
    Ok(HttpResponse::Created().json(created))
}

pub async fn add_order_items(
    state: web::Data<AppState>,
    order_id: web::Path<Uuid>,
    payload: web::Json<AddOrderItemsRequest>,
) -> Result<HttpResponse, AppError> {
    let payload = payload.into_inner();
    let table_id = order_service::resolve_table_id_by_token(&state.db, &payload.token).await?;
    let updated = order_service::add_items_to_order(
        &state,
        order_id.into_inner(),
        table_id,
        payload.items,
    )
    .await?;
    Ok(HttpResponse::Ok().json(updated))
}

pub async fn get_order_status(
    state: web::Data<AppState>,
    order_id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let order: OrderWithItemsView = order_service::get_order(&state.db, order_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(order))
}
