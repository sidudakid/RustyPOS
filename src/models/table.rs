//! Table model used for table-scoped menu access and QR/NFC token resolution.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CafeTable {
    pub id: Uuid,
    pub name: String,
}


#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AdminTableAccessArtifact {
    pub id: Uuid,
    pub table_number: i32,
    pub name: String,
    pub active: bool,
    pub token: String,
    pub token_label: String,
    pub menu_path: String,
}
