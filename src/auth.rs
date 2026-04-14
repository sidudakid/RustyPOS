//! Bearer-token auth helpers for owner/staff/kitchen protected endpoints.

use crate::{errors::AppError, AppState};
use actix_web::{http::header, web, HttpRequest};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
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

impl StaffRole {
    pub fn as_slug(self) -> &'static str {
        match self {
            StaffRole::Owner => "admin",
            StaffRole::Staff => "staff",
            StaffRole::Kitchen => "kitchen",
        }
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct StaffUser {
    pub id: Uuid,
    pub name: String,
    pub role: StaffRole,
    pub auth_token: String,
    pub active: bool,
}

#[derive(Debug, Clone, FromRow)]
pub struct OperatorCredential {
    pub id: Uuid,
    pub role: StaffRole,
    pub login_id: String,
    pub secret_hash: String,
    pub active: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub rotated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OperatorLoginResponse {
    pub role: StaffRole,
    pub login_id: String,
    pub session_token: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct OperatorRoleCredentialResponse {
    pub role: StaffRole,
    pub login_id: String,
    pub secret: String,
}

fn bearer_token(req: &HttpRequest) -> Option<&str> {
    req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
}

fn legacy_hash_secret(secret: &str) -> String {
    let digest = Sha256::digest(secret.as_bytes());
    format!("{:x}", digest)
}

pub fn hash_secret(secret: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .unwrap_or_else(|_| legacy_hash_secret(secret))
}

pub fn verify_secret(secret: &str, expected_hash: &str) -> bool {
    if expected_hash.starts_with("$argon2") {
        return PasswordHash::new(expected_hash)
            .ok()
            .and_then(|parsed| Argon2::default().verify_password(secret.as_bytes(), &parsed).ok())
            .is_some();
    }

    legacy_hash_secret(secret) == expected_hash
}

fn generate_secret(len: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(len)
        .map(char::from)
        .collect()
}

pub fn credential_preview(login_id: &str) -> String {
    let trimmed = login_id.trim();
    if trimmed.len() <= 4 {
        return "••••".into();
    }
    format!("{}••{}", &trimmed[..2], &trimmed[trimmed.len() - 2..])
}

async fn require_role(req: &HttpRequest, state: &web::Data<AppState>, allowed_roles: &[StaffRole]) -> Result<StaffUser, AppError> {
    let token = bearer_token(req).ok_or_else(|| AppError::Unauthorized("missing bearer token".into()))?;

    let session_role = sqlx::query_scalar::<_, StaffRole>(
        "SELECT role
         FROM operator_sessions
         WHERE session_token = $1 AND active = true",
    )
    .bind(token)
    .fetch_optional(&state.db)
    .await?;

    if let Some(role) = session_role {
        sqlx::query(
            "UPDATE operator_sessions
             SET last_used_at = NOW()
             WHERE session_token = $1 AND active = true",
        )
        .bind(token)
        .execute(&state.db)
        .await?;

        if allowed_roles.contains(&role) {
            return Ok(StaffUser {
                id: Uuid::nil(),
                name: format!("{} session", role.as_slug()),
                role,
                auth_token: token.to_string(),
                active: true,
            });
        }
        return Err(AppError::Unauthorized("insufficient role for this endpoint".into()));
    }

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

pub async fn create_operator_session(pool: &sqlx::PgPool, credential: &OperatorCredential) -> Result<OperatorLoginResponse, AppError> {
    let session_token = format!("ops_{}", generate_secret(40));
    sqlx::query(
        "INSERT INTO operator_sessions (id, credential_id, role, session_token, active)
         VALUES ($1, $2, $3, $4, true)",
    )
    .bind(Uuid::new_v4())
    .bind(credential.id)
    .bind(credential.role)
    .bind(&session_token)
    .execute(pool)
    .await?;

    Ok(OperatorLoginResponse {
        role: credential.role,
        login_id: credential.login_id.clone(),
        session_token,
    })
}

pub async fn revoke_operator_sessions_for_role(pool: &sqlx::PgPool, role: StaffRole) -> Result<(), AppError> {
    sqlx::query("UPDATE operator_sessions SET active = false WHERE role = $1")
        .bind(role)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn issue_operator_credential(pool: &sqlx::PgPool, role: StaffRole) -> Result<OperatorRoleCredentialResponse, AppError> {
    let login_id = format!("{}-{}", role.as_slug(), generate_secret(6).to_lowercase());
    let secret = generate_secret(20);
    let secret_hash = hash_secret(&secret);

    sqlx::query("UPDATE operator_credentials SET active = false WHERE role = $1")
        .bind(role)
        .execute(pool)
        .await?;

    sqlx::query(
        "INSERT INTO operator_credentials (id, role, login_id, secret_hash, active)
         VALUES ($1, $2, $3, $4, true)",
    )
    .bind(Uuid::new_v4())
    .bind(role)
    .bind(&login_id)
    .bind(&secret_hash)
    .execute(pool)
    .await?;

    Ok(OperatorRoleCredentialResponse { role, login_id, secret })
}

pub async fn require_owner(req: &HttpRequest, state: &web::Data<AppState>) -> Result<StaffUser, AppError> {
    require_role(req, state, &[StaffRole::Owner]).await
}

pub async fn require_staff_access(req: &HttpRequest, state: &web::Data<AppState>) -> Result<StaffUser, AppError> {
    require_role(req, state, &[StaffRole::Owner, StaffRole::Staff]).await
}

pub async fn require_kitchen_access(req: &HttpRequest, state: &web::Data<AppState>) -> Result<StaffUser, AppError> {
    require_role(req, state, &[StaffRole::Owner, StaffRole::Kitchen]).await
}

pub async fn require_inventory_access(req: &HttpRequest, state: &web::Data<AppState>) -> Result<StaffUser, AppError> {
    require_role(req, state, &[StaffRole::Owner, StaffRole::Staff, StaffRole::Kitchen]).await
}

#[cfg(test)]
mod tests {
    use super::{hash_secret, verify_secret};
    use sha2::{Digest, Sha256};

    #[test]
    fn hashes_new_secrets_with_argon2_and_verifies_them() {
        let secret = "station-secret-123";
        let hash = hash_secret(secret);

        assert!(hash.starts_with("$argon2"));
        assert!(verify_secret(secret, &hash));
        assert!(!verify_secret("wrong-secret", &hash));
    }

    #[test]
    fn still_verifies_legacy_sha256_hashes() {
        let secret = "owner-demo-token";
        let legacy_hash = format!("{:x}", Sha256::digest(secret.as_bytes()));

        assert!(verify_secret(secret, &legacy_hash));
        assert!(!verify_secret("wrong-secret", &legacy_hash));
    }
}
