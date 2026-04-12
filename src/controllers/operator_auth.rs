use crate::{
    auth::{
        credential_preview, create_operator_session, hash_secret, issue_operator_credential,
        require_owner, revoke_operator_sessions_for_role, verify_secret, OperatorCredential,
        StaffRole,
    },
    errors::AppError,
    AppState,
};
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct OperatorLoginRequest {
    pub role: StaffRole,
    pub login_id: String,
    pub secret: String,
}

#[derive(Debug, Serialize)]
pub struct OperatorCredentialListItem {
    pub role: StaffRole,
    pub login_id: String,
    pub active: bool,
    pub rotated_at: chrono::DateTime<chrono::Utc>,
    pub secret_preview: String,
}

#[derive(Debug, Serialize)]
pub struct OperatorCredentialListResponse {
    pub credentials: Vec<OperatorCredentialListItem>,
}

#[derive(Debug, Deserialize)]
pub struct ResetOperatorCredentialRequest {
    pub role: StaffRole,
}

async fn load_credential_by_role(pool: &sqlx::PgPool, role: StaffRole) -> Result<Option<OperatorCredential>, AppError> {
    let credential = sqlx::query_as::<_, OperatorCredential>(
        "SELECT id, role, login_id, secret_hash, active, created_at, rotated_at
         FROM operator_credentials
         WHERE role = $1
         ORDER BY active DESC, rotated_at DESC
         LIMIT 1",
    )
    .bind(role)
    .fetch_optional(pool)
    .await?;

    Ok(credential)
}

pub async fn operator_login(
    state: web::Data<AppState>,
    payload: web::Json<OperatorLoginRequest>,
) -> Result<HttpResponse, AppError> {
    let login_id = payload.login_id.trim().to_lowercase();
    let secret = payload.secret.trim();
    if login_id.is_empty() || secret.is_empty() {
        return Err(AppError::Unauthorized("missing login id or secret".into()));
    }

    let credential = sqlx::query_as::<_, OperatorCredential>(
        "SELECT id, role, login_id, secret_hash, active, created_at, rotated_at
         FROM operator_credentials
         WHERE login_id = $1 AND role = $2 AND active = true
         LIMIT 1",
    )
    .bind(&login_id)
    .bind(payload.role)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("invalid operator credentials".into()))?;

    if !verify_secret(secret, &credential.secret_hash) {
        return Err(AppError::Unauthorized("invalid operator credentials".into()));
    }

    let response = create_operator_session(&state.db, &credential).await?;
    Ok(HttpResponse::Ok().json(response))
}

pub async fn list_operator_credentials(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;

    let mut credentials = Vec::new();
    for role in [StaffRole::Owner, StaffRole::Kitchen, StaffRole::Staff] {
        if let Some(credential) = load_credential_by_role(&state.db, role).await? {
            credentials.push(OperatorCredentialListItem {
                role: credential.role,
                login_id: credential.login_id.clone(),
                active: credential.active,
                rotated_at: credential.rotated_at,
                secret_preview: credential_preview(&credential.login_id),
            });
        }
    }

    Ok(HttpResponse::Ok().json(OperatorCredentialListResponse { credentials }))
}

pub async fn reset_operator_credential(
    req: HttpRequest,
    state: web::Data<AppState>,
    payload: web::Json<ResetOperatorCredentialRequest>,
) -> Result<HttpResponse, AppError> {
    require_owner(&req, &state).await?;

    let response = issue_operator_credential(&state.db, payload.role).await?;
    revoke_operator_sessions_for_role(&state.db, payload.role).await?;
    Ok(HttpResponse::Ok().json(response))
}

pub async fn ensure_operator_credentials(pool: &sqlx::PgPool) -> Result<(), AppError> {
    for role in [StaffRole::Owner, StaffRole::Kitchen, StaffRole::Staff] {
        if load_credential_by_role(pool, role).await?.is_some() {
            continue;
        }

        let legacy = sqlx::query_as::<_, (Option<String>, Option<String>, String)>(
            "SELECT login_id, password_hash, auth_token
             FROM staff_users
             WHERE role = $1
             ORDER BY created_at ASC
             LIMIT 1",
        )
        .bind(role)
        .fetch_optional(pool)
        .await?;

        if let Some((login_id, password_hash, auth_token)) = legacy {
            let login_id = login_id.unwrap_or_else(|| format!("{}-legacy", role.as_slug()));
            let secret_hash = password_hash.unwrap_or_else(|| hash_secret(&auth_token));
            sqlx::query(
                "INSERT INTO operator_credentials (id, role, login_id, secret_hash, active)
                 VALUES ($1, $2, $3, $4, true)",
            )
            .bind(uuid::Uuid::new_v4())
            .bind(role)
            .bind(login_id)
            .bind(secret_hash)
            .execute(pool)
            .await?;
        } else {
            let issued = issue_operator_credential(pool, role).await?;
            log::info!("bootstrapped {:?} operator credential login_id={}", issued.role, issued.login_id);
        }
    }

    Ok(())
}
