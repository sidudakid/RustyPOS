//! Customer-facing handlers for menu browsing, ordering, and status checks.

use crate::{
    errors::AppError,
    models::order::{AddOrderItemsRequest, CreateOrderRequest, CreateTokenOrderRequest, OrderWithItemsView},
    services::order_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

#[derive(Debug, Default, PartialEq, Eq)]
pub struct CustomerMenuQuery {
    pub selected: Vec<Uuid>,
}

fn parse_customer_menu_query(query: &str) -> Result<CustomerMenuQuery, AppError> {
    let mut selected = Vec::new();

    for (key, value) in url::form_urlencoded::parse(query.as_bytes()) {
        if key != "selected" {
            continue;
        }

        for part in value.split(',').map(str::trim).filter(|part| !part.is_empty()) {
            let parsed = Uuid::parse_str(part)
                .map_err(|_| AppError::BadRequest(format!("invalid selected menu item id: {part}")))?;
            selected.push(parsed);
        }
    }

    Ok(CustomerMenuQuery { selected })
}

pub async fn get_table_menu(
    state: web::Data<AppState>,
    req: HttpRequest,
    table_id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    let query = parse_customer_menu_query(req.query_string())?;
    let menu = order_service::get_menu_for_table(&state.db, table_id.into_inner(), &query.selected).await?;
    Ok(HttpResponse::Ok().json(menu))
}

pub async fn get_token_menu(
    state: web::Data<AppState>,
    req: HttpRequest,
    token: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let query = parse_customer_menu_query(req.query_string())?;
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

#[cfg(test)]
mod tests {
    use super::{parse_customer_menu_query, CustomerMenuQuery};
    use uuid::Uuid;

    #[test]
    fn parses_repeated_selected_query_param() {
        let first = Uuid::nil();
        let second = Uuid::from_u128(1);
        let query = format!("selected={first}&selected={second}");

        let parsed = parse_customer_menu_query(&query).expect("query should deserialize");

        assert_eq!(parsed, CustomerMenuQuery { selected: vec![first, second] });
    }

    #[test]
    fn parses_comma_separated_selected_query_param() {
        let first = Uuid::nil();
        let second = Uuid::from_u128(1);
        let query = format!("selected={first},{second}");

        let parsed = parse_customer_menu_query(&query).expect("query should deserialize");

        assert_eq!(parsed, CustomerMenuQuery { selected: vec![first, second] });
    }
}
