use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyRevenuePoint {
    pub month: String,
    pub revenue: i64,
    pub order_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyProfitLossPoint {
    pub month: String,
    pub revenue: i64,
    pub costs: i64,
    pub profit: i64,
    pub margin_percent: Option<f64>,
    pub order_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeakHourPoint {
    pub hour: i32,
    pub order_count: i64,
    pub revenue: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsSummary {
    pub monthly_revenue: Vec<MonthlyRevenuePoint>,
    pub monthly_profit_loss: Vec<MonthlyProfitLossPoint>,
    pub peak_hours: Vec<PeakHourPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyExpenseRecord {
    pub month: String,
    pub rent: i64,
    pub payroll: i64,
    pub utilities: i64,
    pub marketing: i64,
    pub misc: i64,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsertMonthlyExpenseRequest {
    pub month: String,
    pub rent: i64,
    pub payroll: i64,
    pub utilities: i64,
    pub marketing: i64,
    pub misc: i64,
    pub notes: String,
}
