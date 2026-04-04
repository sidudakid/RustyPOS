use crate::{
    errors::AppError,
    models::cafe_settings::{CafeSettings, UpdateCafeSettingsRequest},
};
use sqlx::PgPool;

pub async fn get_settings(pool: &PgPool) -> Result<CafeSettings, AppError> {
    let settings = sqlx::query_as::<_, CafeSettings>(
        "SELECT id, name, image_url, currency_code FROM cafe_settings WHERE id = true",
    )
    .fetch_one(pool)
    .await?;

    Ok(settings)
}

pub async fn update_settings(pool: &PgPool, payload: UpdateCafeSettingsRequest) -> Result<CafeSettings, AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("cafe name cannot be empty".into()));
    }

    if payload.currency_code.trim().is_empty() {
        return Err(AppError::BadRequest("currency code cannot be empty".into()));
    }

    let settings = sqlx::query_as::<_, CafeSettings>(
        "UPDATE cafe_settings
         SET name = $1, image_url = $2, currency_code = UPPER($3)
         WHERE id = true
         RETURNING id, name, image_url, currency_code",
    )
    .bind(payload.name)
    .bind(payload.image_url)
    .bind(payload.currency_code)
    .fetch_one(pool)
    .await?;

    Ok(settings)
}
