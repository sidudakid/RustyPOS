use crate::{
    errors::AppError,
    models::{
        cafe_settings::{CafeSettings, CafeSettingsResponse, UpdateCafeSettingsRequest},
        table::AdminTableAccessArtifact,
    },
};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

pub async fn get_settings(pool: &PgPool) -> Result<CafeSettingsResponse, AppError> {
    let mut tx = pool.begin().await?;
    let settings = fetch_settings(&mut tx).await?;
    sync_tables_with_settings(&mut tx, &settings).await?;
    let table_access = list_table_access_tx(&mut tx).await?;
    tx.commit().await?;

    Ok(CafeSettingsResponse {
        table_name_preview: build_table_preview(&settings.table_prefix, &settings.table_name_style, settings.table_count),
        table_access,
        settings,
    })
}

pub async fn update_settings(pool: &PgPool, payload: UpdateCafeSettingsRequest) -> Result<CafeSettingsResponse, AppError> {
    validate(&payload)?;

    let mut tx = pool.begin().await?;
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
             table_name_style = $21,
             payment_provider = $22,
             payment_mode = $23,
             payment_display_name = $24,
             payment_payee_name = $25,
             payment_vpa = $26,
             payment_phone_number = $27,
             payment_reference_prefix = $28,
             payment_qr_enabled = $29,
             payment_instructions = $30
         WHERE id = true
         RETURNING id, name, legal_name, slug, tagline, image_url, currency_code, primary_color, accent_color,
                   support_email, support_phone, address_line_1, address_line_2, city, state_region, postal_code,
                   country_code, timezone, service_mode, table_count, table_prefix, table_name_style,
                   payment_provider, payment_mode, payment_display_name, payment_payee_name, payment_vpa,
                   payment_phone_number, payment_reference_prefix, payment_qr_enabled, payment_instructions",
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
    .bind(payload.payment_provider.trim())
    .bind(payload.payment_mode.trim())
    .bind(payload.payment_display_name.trim())
    .bind(payload.payment_payee_name.trim())
    .bind(payload.payment_vpa.trim())
    .bind(payload.payment_phone_number.trim())
    .bind(payload.payment_reference_prefix.trim())
    .bind(payload.payment_qr_enabled)
    .bind(payload.payment_instructions.trim())
    .fetch_one(&mut *tx)
    .await?;

    sync_tables_with_settings(&mut tx, &settings).await?;
    let table_access = list_table_access_tx(&mut tx).await?;
    tx.commit().await?;

    Ok(CafeSettingsResponse {
        table_name_preview: build_table_preview(&settings.table_prefix, &settings.table_name_style, settings.table_count),
        table_access,
        settings,
    })
}

pub async fn list_table_access(pool: &PgPool) -> Result<Vec<AdminTableAccessArtifact>, AppError> {
    let mut tx = pool.begin().await?;
    let settings = fetch_settings(&mut tx).await?;
    sync_tables_with_settings(&mut tx, &settings).await?;
    let table_access = list_table_access_tx(&mut tx).await?;
    tx.commit().await?;
    Ok(table_access)
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
    if !matches!(payload.payment_provider.trim(), "none" | "esewa" | "bank_qr" | "upi_qr" | "phonepe") {
        return Err(AppError::BadRequest("payment provider must be one of none, esewa, bank_qr, upi_qr, or phonepe".into()));
    }
    if !matches!(payload.payment_mode.trim(), "disabled" | "demo" | "live") {
        return Err(AppError::BadRequest("payment mode must be disabled, demo, or live".into()));
    }
    if payload.payment_reference_prefix.trim().len() > 24 {
        return Err(AppError::BadRequest("payment reference prefix must be 24 characters or fewer".into()));
    }
    let payment_provider = payload.payment_provider.trim();
    let payment_mode = payload.payment_mode.trim();
    let payment_configured = matches!(payment_provider, "esewa" | "bank_qr" | "upi_qr" | "phonepe") || payload.payment_qr_enabled;
    if payment_configured {
        if payload.payment_display_name.trim().is_empty() {
            return Err(AppError::BadRequest("payment display name cannot be empty when payment is enabled".into()));
        }

        if payment_mode == "live" {
            if payload.payment_payee_name.trim().is_empty() {
                return Err(AppError::BadRequest("payment merchant or wallet account name cannot be empty in live mode".into()));
            }
            if payload.payment_vpa.trim().is_empty() {
                return Err(AppError::BadRequest("payment account handle, merchant code, or eSewa ID cannot be empty in live mode".into()));
            }
        }
    }
    Ok(())
}

async fn fetch_settings(tx: &mut Transaction<'_, Postgres>) -> Result<CafeSettings, AppError> {
    Ok(sqlx::query_as::<_, CafeSettings>(
        "SELECT id, name, legal_name, slug, tagline, image_url, currency_code, primary_color, accent_color,
                support_email, support_phone, address_line_1, address_line_2, city, state_region, postal_code,
                country_code, timezone, service_mode, table_count, table_prefix, table_name_style,
                payment_provider, payment_mode, payment_display_name, payment_payee_name, payment_vpa,
                payment_phone_number, payment_reference_prefix, payment_qr_enabled, payment_instructions
         FROM cafe_settings
         WHERE id = true",
    )
    .fetch_one(&mut **tx)
    .await?)
}

async fn sync_tables_with_settings(tx: &mut Transaction<'_, Postgres>, settings: &CafeSettings) -> Result<(), AppError> {
    let total = settings.table_count.clamp(1, 250);

    for number in 1..=total {
        let table_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM tables WHERE table_number = $1",
        )
        .bind(number)
        .fetch_optional(&mut **tx)
        .await?;

        let name = format_table_name(&settings.table_prefix, &settings.table_name_style, number);

        let table_id = if let Some(table_id) = table_id {
            sqlx::query(
                "UPDATE tables
                 SET name = $2, active = true
                 WHERE id = $1",
            )
            .bind(table_id)
            .bind(&name)
            .execute(&mut **tx)
            .await?;
            table_id
        } else {
            let table_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO tables (id, name, table_number, active)
                 VALUES ($1, $2, $3, true)",
            )
            .bind(table_id)
            .bind(&name)
            .bind(number)
            .execute(&mut **tx)
            .await?;
            table_id
        };

        ensure_table_token(tx, table_id, number, &name).await?;
    }

    sqlx::query(
        "UPDATE tables
         SET active = false
         WHERE table_number > $1",
    )
    .bind(total)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

async fn ensure_table_token(
    tx: &mut Transaction<'_, Postgres>,
    table_id: Uuid,
    table_number: i32,
    table_name: &str,
) -> Result<(), AppError> {
    let token = stable_table_token(table_number);
    let label = format!("QR {}", table_name);

    let existing: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM table_tokens WHERE token = $1",
    )
    .bind(&token)
    .fetch_optional(&mut **tx)
    .await?;

    if let Some(id) = existing {
        sqlx::query(
            "UPDATE table_tokens
             SET table_id = $2, label = $3
             WHERE id = $1",
        )
        .bind(id)
        .bind(table_id)
        .bind(label)
        .execute(&mut **tx)
        .await?;
    } else {
        sqlx::query(
            "INSERT INTO table_tokens (id, table_id, token, label)
             VALUES ($1, $2, $3, $4)",
        )
        .bind(Uuid::new_v4())
        .bind(table_id)
        .bind(token)
        .bind(label)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn list_table_access_tx(
    tx: &mut Transaction<'_, Postgres>,
) -> Result<Vec<AdminTableAccessArtifact>, AppError> {
    Ok(sqlx::query_as::<_, AdminTableAccessArtifact>(
        "SELECT
            t.id,
            t.table_number,
            t.name,
            t.active,
            tt.token,
            tt.label AS token_label,
            '/t/' || tt.token AS menu_path
         FROM tables t
         JOIN table_tokens tt ON tt.table_id = t.id
         WHERE t.table_number IS NOT NULL
           AND t.active = true
           AND tt.token = ('table-' || t.table_number::TEXT || '-qr')
         ORDER BY t.table_number",
    )
    .fetch_all(&mut **tx)
    .await?)
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

    (1..=preview_len)
        .map(|index| format_table_name(prefix, style, index as i32))
        .collect()
}

fn format_table_name(prefix: &str, style: &str, index: i32) -> String {
    let prefix = prefix.trim();
    match style {
        "padded" => format!("{} {:02}", prefix, index),
        "hyphenated" => format!("{}-{}", prefix.replace(' ', "-").to_uppercase(), index),
        _ => format!("{} {}", prefix, index),
    }
}

fn stable_table_token(index: i32) -> String {
    format!("table-{}-qr", index)
}

#[cfg(test)]
mod tests {
    use super::{format_table_name, normalize_slug, stable_table_token};

    #[test]
    fn formats_table_names_from_settings() {
        assert_eq!(format_table_name("Table", "numeric", 3), "Table 3");
        assert_eq!(format_table_name("Patio", "padded", 3), "Patio 03");
        assert_eq!(format_table_name("Window Bar", "hyphenated", 3), "WINDOW-BAR-3");
    }

    #[test]
    fn normalizes_slugs() {
        assert_eq!(normalize_slug("OpenClaw Café"), "openclaw-caf");
        assert_eq!(normalize_slug("  hello -- world  "), "hello-world");
    }

    #[test]
    fn uses_stable_tokens_by_table_number() {
        assert_eq!(stable_table_token(1), "table-1-qr");
        assert_eq!(stable_table_token(12), "table-12-qr");
    }
}
