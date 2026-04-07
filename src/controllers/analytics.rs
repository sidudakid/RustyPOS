use crate::{
    auth::require_owner,
    errors::AppError,
    models::analytics::UpsertMonthlyExpenseRequest,
    services::analytics_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};

pub async fn analytics_summary(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let summary = analytics_service::analytics_summary(&state.db).await?;
    Ok(HttpResponse::Ok().json(summary))
}


pub async fn list_monthly_expenses(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let records = analytics_service::list_monthly_expenses(&state.db).await?;
    Ok(HttpResponse::Ok().json(records))
}

pub async fn upsert_monthly_expense(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<UpsertMonthlyExpenseRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let record = analytics_service::upsert_monthly_expense(&state.db, payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(record))
}
