use crate::{
    auth::require_staff_access,
    errors::AppError,
    models::payment_session::{ConfirmPaymentSessionRequest, CreatePaymentSessionRequest},
    services::order_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};

pub async fn create_payment_session(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<CreatePaymentSessionRequest>,
) -> Result<HttpResponse, AppError> {
    require_staff_access(&req, &state).await?;
    let session = order_service::create_payment_session(&state.db, payload.into_inner().table_id).await?;
    Ok(HttpResponse::Created().json(session))
}

pub async fn get_payment_session(
    state: web::Data<AppState>,
    session_token: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let session = order_service::get_payment_session(&state.db, &session_token.into_inner()).await?;
    Ok(HttpResponse::Ok().json(session))
}

pub async fn confirm_payment_session(
    state: web::Data<AppState>,
    session_token: web::Path<String>,
    payload: web::Json<ConfirmPaymentSessionRequest>,
) -> Result<HttpResponse, AppError> {
    let result = order_service::confirm_payment_session(&state.db, &session_token.into_inner(), payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(result))
}
