use crate::models::table::AdminTableAccessArtifact;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CafeSettings {
    pub id: bool,
    pub name: String,
    pub legal_name: String,
    pub slug: String,
    pub tagline: String,
    pub image_url: String,
    pub currency_code: String,
    pub primary_color: String,
    pub accent_color: String,
    pub support_email: String,
    pub support_phone: String,
    pub address_line_1: String,
    pub address_line_2: String,
    pub city: String,
    pub state_region: String,
    pub postal_code: String,
    pub country_code: String,
    pub timezone: String,
    pub service_mode: String,
    pub table_count: i32,
    pub table_prefix: String,
    pub table_name_style: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CafeSettingsResponse {
    #[serde(flatten)]
    pub settings: CafeSettings,
    pub table_name_preview: Vec<String>,
    pub table_access: Vec<AdminTableAccessArtifact>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCafeSettingsRequest {
    pub name: String,
    pub legal_name: String,
    pub slug: String,
    pub tagline: String,
    pub image_url: String,
    pub currency_code: String,
    pub primary_color: String,
    pub accent_color: String,
    pub support_email: String,
    pub support_phone: String,
    pub address_line_1: String,
    pub address_line_2: String,
    pub city: String,
    pub state_region: String,
    pub postal_code: String,
    pub country_code: String,
    pub timezone: String,
    pub service_mode: String,
    pub table_count: i32,
    pub table_prefix: String,
    pub table_name_style: String,
}
