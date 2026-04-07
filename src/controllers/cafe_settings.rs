use crate::{
    auth::require_owner,
    errors::AppError,
    models::cafe_settings::UpdateCafeSettingsRequest,
    services::cafe_settings_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};

pub async fn get_cafe_settings(state: web::Data<AppState>) -> Result<HttpResponse, AppError> {
    let settings = cafe_settings_service::get_settings(&state.db).await?;
    Ok(HttpResponse::Ok().json(settings))
}

pub async fn update_cafe_settings(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<UpdateCafeSettingsRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let settings = cafe_settings_service::update_settings(&state.db, payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(settings))
}

pub async fn list_admin_tables(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let tables = cafe_settings_service::list_table_access(&state.db).await?;
    Ok(HttpResponse::Ok().json(tables))
}

pub async fn list_admin_table_operations(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let tables = crate::services::order_service::list_table_operational_summary(&state.db).await?;
    Ok(HttpResponse::Ok().json(tables))
}
