//! Bearer-token auth helpers for owner/staff/kitchen protected endpoints.

use crate::{errors::AppError, AppState};
use actix_web::{http::header, web, HttpRequest};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "staff_role", rename_all = "snake_case")]
pub enum StaffRole {
    Owner,
    Staff,
    Kitchen,
}

#[derive(Debug, Clone, FromRow)]
pub struct StaffUser {
    pub id: Uuid,
    pub name: String,
    pub role: StaffRole,
    pub auth_token: String,
    pub active: bool,
}

fn bearer_token(req: &HttpRequest) -> Option<&str> {
    req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
}

async fn require_role(req: &HttpRequest, state: &web::Data<AppState>, allowed_roles: &[StaffRole]) -> Result<StaffUser, AppError> {
    let token = bearer_token(req).ok_or_else(|| AppError::Unauthorized("missing bearer token".into()))?;

    let staff_user = sqlx::query_as::<_, StaffUser>(
        "SELECT id, name, role, auth_token, active
         FROM staff_users
         WHERE auth_token = $1 AND active = true",
    )
    .bind(token)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("missing or invalid bearer token".into()))?;

    if allowed_roles.contains(&staff_user.role) {
        Ok(staff_user)
    } else {
        Err(AppError::Unauthorized("insufficient role for this endpoint".into()))
    }
}

pub async fn require_owner(req: &HttpRequest, state: &web::Data<AppState>) -> Result<StaffUser, AppError> {
    require_role(req, state, &[StaffRole::Owner]).await
}

pub async fn require_kitchen_access(req: &HttpRequest, state: &web::Data<AppState>) -> Result<StaffUser, AppError> {
    require_role(req, state, &[StaffRole::Owner, StaffRole::Staff, StaffRole::Kitchen]).await
}
