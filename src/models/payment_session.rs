use chrono::{DateTime, Utc};
use postgres_types::{FromSql, ToSql};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type, ToSql, FromSql)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "payment_session_status", rename_all = "snake_case")]
#[postgres(name = "payment_session_status")]
pub enum PaymentSessionStatus {
    Pending,
    Confirmed,
    Expired,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PaymentSessionRow {
    pub id: Uuid,
    pub session_token: String,
    pub table_id: Uuid,
    pub table_name_snapshot: String,
    pub table_number_snapshot: Option<i32>,
    pub tracking_token_snapshot: Option<String>,
    pub amount_total: i64,
    pub currency_code: String,
    pub payment_provider: String,
    pub payment_mode: String,
    pub payment_label: String,
    pub reference_code: String,
    pub status: PaymentSessionStatus,
    pub confirmed_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSessionView {
    pub id: Uuid,
    pub session_token: String,
    pub table_id: Uuid,
    pub table_name: String,
    pub table_number: Option<i32>,
    pub tracking_token: Option<String>,
    pub amount_total: i64,
    pub currency_code: String,
    pub payment_provider: String,
    pub payment_mode: String,
    pub payment_label: String,
    pub reference_code: String,
    pub status: PaymentSessionStatus,
    pub confirmed_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<PaymentSessionRow> for PaymentSessionView {
    fn from(value: PaymentSessionRow) -> Self {
        Self {
            id: value.id,
            session_token: value.session_token,
            table_id: value.table_id,
            table_name: value.table_name_snapshot,
            table_number: value.table_number_snapshot,
            tracking_token: value.tracking_token_snapshot,
            amount_total: value.amount_total,
            currency_code: value.currency_code,
            payment_provider: value.payment_provider,
            payment_mode: value.payment_mode,
            payment_label: value.payment_label,
            reference_code: value.reference_code,
            status: value.status,
            confirmed_at: value.confirmed_at,
            expires_at: value.expires_at,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentSessionRequest {
    pub table_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfirmPaymentSessionRequest {
    pub demo_confirmation_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSessionResult {
    pub session: PaymentSessionView,
    pub settled_orders: Vec<crate::models::order::OrderWithItemsView>,
}
