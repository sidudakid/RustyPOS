use crate::{
    errors::AppError,
    models::cafe_settings::{CafeSettings, CafeSettingsResponse, UpdateCafeSettingsRequest},
};
use sqlx::PgPool;

pub async fn get_settings(pool: &PgPool) -> Result<CafeSettingsResponse, AppError> {
    let settings = sqlx::query_as::<_, CafeSettings>(
        "SELECT id, name, legal_name, slug, tagline, image_url, currency_code, primary_color, accent_color,
                support_email, support_phone, address_line_1, address_line_2, city, state_region, postal_code,
                country_code, timezone, service_mode, table_count, table_prefix, table_name_style
         FROM cafe_settings
         WHERE id = true",
    )
    .fetch_one(pool)
    .await?;

    Ok(CafeSettingsResponse {
        table_name_preview: build_table_preview(&settings.table_prefix, &settings.table_name_style, settings.table_count),
        settings,
    })
}

pub async fn update_settings(pool: &PgPool, payload: UpdateCafeSettingsRequest) -> Result<CafeSettingsResponse, AppError> {
    validate(&payload)?;

    let settings = sqlx::query_as::<_, CafeSettings>(
        "UPDATE cafe_settings
         SET name = $1,
             legal_name = $2,
             slug = $3,
             tagline = $4,
             image_url = $5,
             currency_code = UPPER($6),
             primary_color = UPPER($7),
             accent_color = UPPER($8),
             support_email = $9,
             support_phone = $10,
             address_line_1 = $11,
             address_line_2 = $12,
             city = $13,
             state_region = $14,
             postal_code = $15,
             country_code = UPPER($16),
             timezone = $17,
             service_mode = $18,
             table_count = $19,
             table_prefix = $20,
             table_name_style = $21
         WHERE id = true
         RETURNING id, name, legal_name, slug, tagline, image_url, currency_code, primary_color, accent_color,
                   support_email, support_phone, address_line_1, address_line_2, city, state_region, postal_code,
                   country_code, timezone, service_mode, table_count, table_prefix, table_name_style",
    )
    .bind(payload.name.trim())
    .bind(payload.legal_name.trim())
    .bind(normalize_slug(&payload.slug))
    .bind(payload.tagline.trim())
    .bind(payload.image_url.trim())
    .bind(payload.currency_code.trim())
    .bind(payload.primary_color.trim())
    .bind(payload.accent_color.trim())
    .bind(payload.support_email.trim())
    .bind(payload.support_phone.trim())
    .bind(payload.address_line_1.trim())
    .bind(payload.address_line_2.trim())
    .bind(payload.city.trim())
    .bind(payload.state_region.trim())
    .bind(payload.postal_code.trim())
    .bind(payload.country_code.trim())
    .bind(payload.timezone.trim())
    .bind(payload.service_mode.trim())
    .bind(payload.table_count)
    .bind(payload.table_prefix.trim())
    .bind(payload.table_name_style.trim())
    .fetch_one(pool)
    .await?;

    Ok(CafeSettingsResponse {
        table_name_preview: build_table_preview(&settings.table_prefix, &settings.table_name_style, settings.table_count),
        settings,
    })
}

fn validate(payload: &UpdateCafeSettingsRequest) -> Result<(), AppError> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("cafe name cannot be empty".into()));
    }
    if payload.legal_name.trim().is_empty() {
        return Err(AppError::BadRequest("legal name cannot be empty".into()));
    }
    if normalize_slug(&payload.slug).is_empty() {
        return Err(AppError::BadRequest("slug cannot be empty".into()));
    }
    if payload.currency_code.trim().len() != 3 {
        return Err(AppError::BadRequest("currency code must be 3 characters".into()));
    }
    if payload.country_code.trim().len() != 2 {
        return Err(AppError::BadRequest("country code must be 2 characters".into()));
    }
    if !is_hex_color(&payload.primary_color) || !is_hex_color(&payload.accent_color) {
        return Err(AppError::BadRequest("brand colors must be valid hex colors like #2563EB".into()));
    }
    if !(1..=250).contains(&payload.table_count) {
        return Err(AppError::BadRequest("table count must be between 1 and 250".into()));
    }
    if payload.table_prefix.trim().is_empty() {
        return Err(AppError::BadRequest("table prefix cannot be empty".into()));
    }
    if !matches!(payload.table_name_style.trim(), "numeric" | "padded" | "hyphenated") {
        return Err(AppError::BadRequest("table name style must be numeric, padded, or hyphenated".into()));
    }
    if !matches!(payload.service_mode.trim(), "table_service" | "counter_service" | "hybrid") {
        return Err(AppError::BadRequest("service mode must be table_service, counter_service, or hybrid".into()));
    }
    Ok(())
}

fn normalize_slug(input: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;

    for ch in input.trim().chars() {
        let lowered = ch.to_ascii_lowercase();
        if lowered.is_ascii_alphanumeric() {
            slug.push(lowered);
            previous_dash = false;
        } else if !previous_dash && !slug.is_empty() {
            slug.push('-');
            previous_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

fn is_hex_color(input: &str) -> bool {
    let value = input.trim();
    value.len() == 7 && value.starts_with('#') && value.chars().skip(1).all(|c| c.is_ascii_hexdigit())
}

fn build_table_preview(prefix: &str, style: &str, table_count: i32) -> Vec<String> {
    let total = table_count.clamp(1, 250) as usize;
    let preview_len = total.min(6);
    let prefix = prefix.trim();

    (1..=preview_len)
        .map(|index| match style {
            "padded" => format!("{} {:02}", prefix, index),
            "hyphenated" => format!("{}-{}", prefix.replace(' ', "-").to_uppercase(), index),
            _ => format!("{} {}", prefix, index),
        })
        .collect()
}
