//! Table model used for table-scoped menu access and QR/NFC token resolution.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CafeTable {
    pub id: Uuid,
    pub name: String,
}
