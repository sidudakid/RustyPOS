use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CafeSettings {
    pub id: bool,
    pub name: String,
    pub image_url: String,
    pub currency_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCafeSettingsRequest {
    pub name: String,
    pub image_url: String,
    pub currency_code: String,
}
