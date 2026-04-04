//! Admin handlers for menu/category management.

use crate::{
    auth::require_owner,
    errors::AppError,
    models::menu_item::{
        CreateCategoryRequest, CreateMenuItemRequest, ItemAvailabilityRequest, UpdateCategoryRequest,
        UpdateMenuItemRequest,
    },
    services::menu_service,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

pub async fn list_categories(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let categories = menu_service::list_categories(&state.db).await?;
    Ok(HttpResponse::Ok().json(categories))
}

pub async fn create_category(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<CreateCategoryRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let category = menu_service::create_category(&state.db, payload.into_inner()).await?;
    Ok(HttpResponse::Created().json(category))
}

pub async fn update_category(
    req: HttpRequest,
    state: web::Data<AppState>,
    category_id: web::Path<Uuid>,
    payload: web::Json<UpdateCategoryRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let category = menu_service::update_category(&state.db, category_id.into_inner(), payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(category))
}

pub async fn archive_category(
    req: HttpRequest,
    state: web::Data<AppState>,
    category_id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let category = menu_service::archive_category(&state.db, category_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(category))
}

pub async fn list_menu_items(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let items = menu_service::list_menu_items(&state.db).await?;
    Ok(HttpResponse::Ok().json(items))
}

pub async fn create_menu_item(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<CreateMenuItemRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let item = menu_service::create_menu_item(&state.db, payload.into_inner()).await?;
    Ok(HttpResponse::Created().json(item))
}

pub async fn update_menu_item(
    req: HttpRequest,
    state: web::Data<AppState>,
    item_id: web::Path<Uuid>,
    payload: web::Json<UpdateMenuItemRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let item = menu_service::update_menu_item(&state.db, item_id.into_inner(), payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(item))
}

pub async fn archive_menu_item(
    req: HttpRequest,
    state: web::Data<AppState>,
    item_id: web::Path<Uuid>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let item = menu_service::archive_menu_item(&state.db, item_id.into_inner()).await?;
    Ok(HttpResponse::Ok().json(item))
}

pub async fn set_menu_item_availability(
    req: HttpRequest,
    state: web::Data<AppState>,
    item_id: web::Path<Uuid>,
    payload: web::Json<ItemAvailabilityRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;
    let item = menu_service::set_item_availability(&state.db, item_id.into_inner(), payload.into_inner()).await?;
    Ok(HttpResponse::Ok().json(item))
}
