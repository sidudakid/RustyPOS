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
    pub direct_cost: i64,
    pub operating_expenses: i64,
    pub profit_or_loss: i64,
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
