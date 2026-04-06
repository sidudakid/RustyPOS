use crate::{
    auth::require_owner,
    errors::AppError,
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
