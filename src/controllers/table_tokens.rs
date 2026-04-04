//! Handlers for resolving QR/NFC tokens to café tables.

use crate::{errors::AppError, services::order_service, AppState};
use actix_web::{web, HttpResponse};

pub async fn resolve_table_token(
    state: web::Data<AppState>,
    token: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let table = order_service::get_table_by_token(&state.db, &token.into_inner()).await?;
    Ok(HttpResponse::Ok().json(table))
}
